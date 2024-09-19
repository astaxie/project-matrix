import { cloneDeep } from "lodash";
import type { RapidPage, RapidEntityFormConfig } from "@ruiapp/rapid-extension";
import { materialFormatStrTemplate } from "~/utils/fmt";

const formConfig: Partial<RapidEntityFormConfig> = {
  items: [
    // {
    //   type: "auto",
    //   code: "code",
    // },
    {
      type: "auto",
      code: "material",
      formControlProps: {
        dropdownMatchSelectWidth: 500,
        listTextFormat: materialFormatStrTemplate,
        listFilterFields: ["name", "code", "specification"],
        columns: [
          { code: "code", title: "编号", width: 120 },
          { code: "name", title: "名称", width: 120 },
          { code: "specification", title: "规格", width: 120 },
        ],
      },
      required: true,
    },
    {
      type: "auto",
      code: "lotNum",
      required: true,
    },
    {
      type: "auto",
      code: "sampleCount",
      required: true,
    },
    // {
    //   type: "auto",
    //   code: "serialNum",
    // },
    {
      code: "inventoryOperation",
      type: "auto",
      formControlProps: {
        listTextFormat: "{{code}}",
        listFilterFields: ["code"],
        columns: [{ code: "code", title: "操作单号" }],
      },
    },
    // {
    //   code: "workOrder",
    //   type: "auto",
    // },
    // {
    //   code: "workTrack",
    //   type: "auto",
    // },
    // {
    //   code: "workTask",
    //   type: "auto",
    // },
    {
      code: "rule",
      type: "auto",
      listDataFindOptions: {
        fixedFilters: [
          {
            field: "customer",
            operator: "null",
          },
        ],
      },
      formControlProps: {
        listSearchable: true,
        listTextFormat: "{{name}}",
        listFilterFields: ["name"],
      },
      required: true,
    },
    // {
    //   code: "routeProcess",
    //   type: "auto",
    // },
    {
      type: "auto",
      code: "sender",
    },
    {
      type: "auto",
      code: "remark",
    },
    // {
    //   type: "auto",
    //   code: "result",
    // },
    // {
    //   type: "auto",
    //   code: "state",
    // },
    // {
    //   type: "auto",
    //   code: "approvalState",
    // },
  ],
  defaultFormFields: {
    result: "uninspected",
    state: "pending",
    approvalState: "uninitiated",
    round: "1",
  },
};

const page: RapidPage = {
  code: "mom_inspection_sheet_list",
  name: "检验单管理",
  title: "检验单管理",
  view: [
    {
      $type: "sonicEntityList",
      entityCode: "MomInspectionSheet",
      viewMode: "table",
      // permissionCheck: {any: ["inspection.manage"]},
      selectionMode: "none",
      listActions: [
        {
          $type: "sonicToolbarNewEntityButton",
          text: "新建",
          icon: "PlusOutlined",
          actionStyle: "primary",
        },
        {
          $type: "antdButton",
          href: `/api/app/exportExcel?type=inspection`,
          children: [
            {
              $type: "text",
              text: " 下载",
            },
          ],
        },
      ],
      extraProperties: ["rule", "treatment"],
      extraActions: [
        {
          $type: "sonicToolbarFormItem",
          formItemType: "search",
          placeholder: "搜索批号、检验单号",
          actionEventName: "onSearch",
          filterMode: "contains",
          filterFields: ["code", "lotNum"],
        },
      ],
      enabledFilterCache: true,
      filterCacheName: "mom_inspection_sheet_list",
      searchForm: {
        entityCode: "MomInspectionSheet",
        items: [
          {
            type: "auto",
            code: "state",
            filterMode: "in",
            itemType: "text",
          },
          {
            type: "auto",
            code: "approvalState",
            filterMode: "in",
            itemType: "text",
          },
          {
            type: "auto",
            code: "result",
            filterMode: "in",
            itemType: "text",
          },
          {
            type: "auto",
            code: "inspector",
            filterMode: "in",
            filterFields: ["inspector_id"],
          },
          {
            type: "auto",
            code: "materialCategory",
            label: "物料类型",
            formControlType: "rapidEntityTableSelect",
            formControlProps: {
              entityCode: "BaseMaterialCategory",
              mode: "multiple",
            },
            filterMode: "in",
            filterFields: [
              {
                field: "material",
                operator: "exists",
                filters: [
                  {
                    field: "category_id",
                    operator: "in",
                  },
                ],
              },
            ],
          },
          {
            type: "auto",
            code: "material",
            formControlType: "rapidEntityTableSelect",
            formControlProps: {
              entityCode: "BaseMaterial",
              dropdownMatchSelectWidth: 500,
              listTextFormat: materialFormatStrTemplate,
              listFilterFields: ["name", "code", "specification"],
              requestParams: {
                properties: ["id", "code", "name", "specification", "defaultUnit", "category"],
                keepNonPropertyFields: true,
              },
              columns: [
                {
                  title: "名称",
                  code: "name",
                  width: 120,
                },
                {
                  title: "编号",
                  code: "code",
                  width: 120,
                },
                {
                  title: "规格",
                  code: "specification",
                  width: 120,
                },
              ],
            },
            filterMode: "in",
            filterFields: [
              {
                field: "material",
                operator: "exists",
                filters: [
                  {
                    field: "id",
                    operator: "in",
                  },
                ],
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          field: "id",
          desc: true,
        },
      ],
      relations: {
        material: {
          properties: ["id", "code", "name", "specification", "category"],
          relations: {
            category: true,
          },
        },
      },
      columns: [
        {
          type: "auto",
          fixed: "left",
          code: "state",
          width: "100px",
        },
        {
          type: "auto",
          fixed: "left",
          code: "approvalState",
          width: "100px",
        },
        {
          type: "link",
          code: "code",
          width: "200px",
          fixed: "left",
          rendererType: "link",
          rendererProps: {
            url: "/pages/mom_inspection_sheet_details?id={{id}}",
          },
        },
        {
          code: "materialCategory",
          type: "auto",
          width: "120px",
          title: "物料类型",
          rendererType: "text",
          rendererProps: {
            $exps: {
              text: "_.get($slot.record, 'material.category.name')",
            },
          },
        },
        {
          type: "auto",
          code: "material",
          fixed: "left",
          rendererType: "anchor",
          rendererProps: {
            children: {
              $type: "materialLabelRenderer",
              $exps: {
                value: "$slot.value",
              },
            },
            $exps: {
              href: "$rui.execVarText('/pages/base_material_details?id={{id}}', $slot.value)",
            },
          },
        },
        {
          code: "rule",
          type: "auto",
          rendererProps: {
            format: "{{name}}",
          },
        },
        {
          type: "auto",
          code: "lotNum",
          width: "150px",
        },
        {
          type: "auto",
          code: "inventoryOperation",
          width: "150px",
          rendererProps: {
            format: "{{code}}",
          },
        },
        {
          type: "auto",
          code: "acceptQuantity",
          width: "100px",
        },
        {
          type: "auto",
          code: "result",
          width: "150px",
        },
        {
          type: "auto",
          code: "treatment",
          width: "100px",
        },
        {
          type: "auto",
          code: "sender",
          width: "150px",
          rendererProps: {
            format: "{{name}}",
          },
        },
        {
          type: "auto",
          code: "inspector",
          width: "150px",
          rendererProps: {
            format: "{{name}}",
          },
        },
        {
          type: "auto",
          code: "reviewer",
          width: "150px",
          rendererProps: {
            format: "{{name}}",
          },
        },
        {
          type: "auto",
          code: "createdAt",
          width: "150px",
        },
      ],
      actionsColumnWidth: "160px",
      actions: [
        {
          $type: "sonicRecordActionEditEntity",
          code: "edit",
          actionType: "edit",
          actionText: "修改",
          // $permissionCheck: "inspection.manage",
          // $exps: {
          //   disabled: "$slot.record.approvalState !== 'approving' && $slot.record.approvalState !== 'uninitiated'",
          // },
        },
        {
          $type: "sonicRecordActionDeleteEntity",
          code: "delete",
          actionType: "delete",
          actionText: "删除",
          dataSourceCode: "list",
          entityCode: "MomInspectionSheet",
          // $permissionCheck: "inspectionSheet.manage",
          $exps: {
            disabled: "$slot.record.approvalState !== 'approving' && $slot.record.approvalState !== 'uninitiated'",
          },
        },
        {
          $type: "inspectionBadAction",
          $exps: {
            _hidden: "$slot.record.result !== 'unqualified'",
          },
        },
      ],
      newForm: cloneDeep(formConfig),
      editForm: cloneDeep(formConfig),
      $exps: {
        "newForm.fixedFields.state": '"pending"',
        "newForm.fixedFields.approvalState": '"uninitiated"',
      },
    },
  ],
};

export default page;
