import type { ActionHandlerContext, IRpdServer, RouteContext, ServerOperation } from "@ruiapp/rapid-core";
import type {
  BaseLot,
  BaseMaterial,
  MomInventoryApplication,
  MomInventoryApplicationItem,
  MomWarehouseStrategy,
  SaveBaseLotInput,
  SaveMomInventoryApplicationItemInput,
} from "~/_definitions/meta/entity-types";

export type CreateInventoryApplicationItemInput = {
  application: number;
  material: number;
  unit: number;
  lotNum?: string;
  quantity?: number;
  remark?: string;
};

export default {
  code: "createInventoryApplicationItems",
  method: "POST",
  async handler(ctx: ActionHandlerContext) {
    const { server, routerContext: routeContext } = ctx;
    const input: CreateInventoryApplicationItemInput = ctx.input;

    await createInventoryApplicationItems(routeContext, server, input);

    ctx.output = {
      result: ctx.input,
    };
  },
} satisfies ServerOperation;

export async function createInventoryApplicationItems(routeContext: RouteContext, server: IRpdServer, input: CreateInventoryApplicationItemInput) {
  const inventoryApplication = await getInventoryApplication(routeContext, server, input.application);
  const material = await getMaterial(routeContext, server, input.material);

  if (!material) {
    throw new Error("Material not found.");
  }

  if (!inventoryApplication) {
    throw new Error("Inventory application not found.");
  }

  // const warehouseStrategy = await getWarehouseStrategy(
  //   server,
  //   material.category?.id,
  //   inventoryApplication?.businessType?.id
  // );

  // if (warehouseStrategy?.strategy === "fifo" || warehouseStrategy?.strategy === "fdfo") {
  //   await handleFifoFdfoStrategy(server, input, material, warehouseStrategy);
  // } else {
  //   await handleOtherStrategies(server, input, inventoryApplication, material);
  // }

  await handleOtherStrategies(routeContext, server, input, inventoryApplication, material);
}

async function getInventoryApplication(routeContext: RouteContext, server: IRpdServer, applicationId: number) {
  const inventoryApplicationManager = server.getEntityManager<MomInventoryApplication>("mom_inventory_application");
  return await inventoryApplicationManager.findEntity({
    routeContext,
    filters: [{ field: "id", operator: "eq", value: applicationId }],
    properties: ["id", "status", "operationType", "businessType"],
  });
}

async function getMaterial(routeContext: RouteContext, server: IRpdServer, materialId: number) {
  const materialManager = server.getEntityManager<BaseMaterial>("base_material");
  return await materialManager.findEntity({
    routeContext,
    filters: [{ field: "id", operator: "eq", value: materialId }],
    properties: ["id", "name", "code", "category", "defaultUnit", "isInspectionFree"],
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getWarehouseStrategy(routeContext: RouteContext, server: IRpdServer, materialCategoryId?: number, businessTypeId?: number) {
  const warehouseStrategyManager = server.getEntityManager<MomWarehouseStrategy>("mom_warehouse_strategy");
  return await warehouseStrategyManager.findEntity({
    routeContext,
    filters: [
      { field: "material_category_id", operator: "eq", value: materialCategoryId },
      { field: "business_type_id", operator: "eq", value: businessTypeId },
      { field: "enabled", operator: "eq", value: true },
    ],
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleFifoFdfoStrategy(
  routeContext: RouteContext,
  server: IRpdServer,
  input: CreateInventoryApplicationItemInput,
  material: BaseMaterial,
  warehouseStrategy: MomWarehouseStrategy,
) {
  const warehouseStrategyStmt = getWarehouseStrategyStatement(warehouseStrategy.strategy);
  const strategyFilter = getStrategyFilter(warehouseStrategy);

  const goods = await server.queryDatabaseObject(
    `
      WITH good_moving_sum_cte AS (SELECT mg.*,
                                          SUM(mg.quantity) OVER (
                                            PARTITION BY mg.material_id
                                              ${warehouseStrategyStmt}
                                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                            ) - mg.quantity AS moving_sum
                                   FROM mom_goods mg
                                   WHERE mg.material_id = $1
                                     AND mg.quantity > 0
                                     AND lot_num IS NOT NULL
                                     ${strategyFilter})
      SELECT *
      FROM good_moving_sum_cte
      WHERE moving_sum <= $2;
    `,
    [material.id, input.quantity],
    routeContext.getDbTransactionClient(),
  );

  for (const good of goods) {
    const entitySave = createEntitySaveObject(input, material, good);
    await saveInventoryApplicationItem(routeContext, server, entitySave);
  }
}

async function handleOtherStrategies(
  routeContext: RouteContext,
  server: IRpdServer,
  input: CreateInventoryApplicationItemInput,
  inventoryApplication: MomInventoryApplication,
  material: BaseMaterial,
) {
  if (!input.lotNum) {
    throw new Error("Lot number is required.");
  }

  const lotInfo = await saveMaterialLotInfo(routeContext, server, {
    lotNum: input.lotNum,
    material: { id: input.material },
    sourceType: inventoryApplication?.businessType?.config?.defaultSourceType || null,
    qualificationState: material.isInspectionFree ? "qualified" : inventoryApplication?.businessType?.config?.defaultQualificationState || "uninspected",
    isAOD: false,
    state: "pending",
  });

  const entitySave = createEntitySaveObject(input, material, {
    lot_num: input.lotNum,
    quantity: input.quantity,
    lot_id: lotInfo.id,
  });
  await saveInventoryApplicationItem(routeContext, server, entitySave);
}

function getWarehouseStrategyStatement(strategy?: string): string {
  switch (strategy) {
    case "fifo":
      return "ORDER BY mg.created_at ASC";
    case "fdfo":
      return "ORDER BY mg.validity_date ASC";
    default:
      throw new Error("Unknown warehouse strategy.");
  }
}

function getStrategyFilter(warehouseStrategy: MomWarehouseStrategy): string {
  let strategyFilter = "";
  // if (warehouseStrategy?.qualifiedFilter) {
  //   strategyFilter += " AND mg.qualified = true";
  // }
  if (warehouseStrategy?.validityFilter) {
    strategyFilter += " AND mg.validity_date >= now()";
  }
  return strategyFilter;
}

function createEntitySaveObject(input: CreateInventoryApplicationItemInput, material: BaseMaterial, good: any): SaveMomInventoryApplicationItemInput {
  return {
    application: { id: input.application },
    material: { id: material.id },
    unit: { id: material.defaultUnit?.id },
    lotNum: good.lot_num,
    quantity: good.quantity,
    orderNum: 1,
    remark: input.remark,
    lot: good.lot_id ? { id: good.lot_id } : undefined,
  };
}

async function saveInventoryApplicationItem(routeContext: RouteContext, server: IRpdServer, entitySave: SaveMomInventoryApplicationItemInput) {
  const inventoryApplicationItemManager = server.getEntityManager<MomInventoryApplicationItem>("mom_inventory_application_item");
  await inventoryApplicationItemManager.createEntity({
    routeContext,
    entity: entitySave,
  });
}

async function saveMaterialLotInfo(routeContext: RouteContext, server: IRpdServer, lot: SaveBaseLotInput) {
  if (!lot.lotNum || !lot.material || !lot.material.id) {
    throw new Error("lotNum and material are required when saving lot info.");
  }

  const baseLotManager = server.getEntityManager<BaseLot>("base_lot");
  const lotInDb = await baseLotManager.findEntity({
    routeContext,
    filters: [
      { operator: "eq", field: "lot_num", value: lot.lotNum },
      { operator: "eq", field: "material_id", value: lot.material.id },
    ],
  });

  return lotInDb || (await baseLotManager.createEntity({ routeContext, entity: lot }));
}
