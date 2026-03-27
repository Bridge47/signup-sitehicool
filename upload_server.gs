// =============================================
// Google Apps Script — PDF 上传 + 表单数据写入 Google Sheets
// =============================================

var FOLDER_NAME = "HICOOL_报名附件";
var SHEET_NAME  = "HICOOL_报名数据";

// ---- 路由：根据 type 字段区分请求 ----
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);

    if (params.type === "formData") {
      return handleFormData(params);
    } else {
      return handlePdfUpload(params);
    }

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ---- 处理 PDF 上传 ----
function handlePdfUpload(params) {
  var fileName       = params.fileName;
  var base64Data     = params.fileData;
  var applicantName  = params.applicantName || "未知";
  var applicantEmail = params.email || "";

  var decoded = Utilities.base64Decode(base64Data);
  var blob    = Utilities.newBlob(decoded, "application/pdf", fileName);

  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);

  var file = folder.createFile(blob);
  file.setDescription("申请人：" + applicantName + " | 邮箱：" + applicantEmail);

  return jsonResponse({ success: true, fileUrl: file.getUrl(), fileName: fileName });
}

// ---- 处理表单数据 → 写入 Google Sheets ----
function handleFormData(params) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // 组装一行数据（与下面的表头顺序对应）
  var edu  = JSON.stringify(params.educationList  || []);
  var work = JSON.stringify(params.workList       || []);

  var row = [
    new Date(),                        // 提交时间
    params.fullName        || "",
    params.email           || "",
    params.phone           || "",
    params.companyLocation || "",
    params.companyName     || params.companyNameOverseas || "",
    params.officeAddress   || "",
    params.continent       || params.continent2 || "",
    params.country         || params.country2   || "",
    params.phase           || "",
    params.group           || "",
    params.projOverview    || "",
    params.projFeature     || "",
    params.projMarket      || "",
    params.idNumber        || "",
    params.personalBio     || "",
    edu,
    work,
    params.pdfUrl          || "",
  ];

  sheet.appendRow(row);

  return jsonResponse({ success: true });
}

// ---- 获取或创建 Sheet（自动写表头）----
function getOrCreateSheet() {
  var files = DriveApp.getFilesByName(SHEET_NAME + ".xlsx");
  var ss;

  // 先尝试在 Drive 根目录找同名 Spreadsheet
  var ssList = DriveApp.getFilesByName(SHEET_NAME);
  if (ssList.hasNext()) {
    ss = SpreadsheetApp.openById(ssList.next().getId());
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    var sheet = ss.getActiveSheet();
    sheet.setName(SHEET_NAME);
    // 写表头
    sheet.appendRow([
      "提交时间", "姓名", "邮箱", "手机号",
      "项目所属公司", "公司名称", "办公地址",
      "所在洲", "所在国家",
      "期别", "组别",
      "项目概况", "产品/服务特点", "项目市场化能力",
      "身份证号", "个人简介及荣誉",
      "教育经历（JSON）", "工作经历（JSON）",
      "附件链接",
    ]);
  }
  return ss;
}

// ---- 工具：返回 JSON ----
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({ status: "ok", message: "HICOOL Upload & Form Service" });
}

// =============================================
// 部署步骤：
// 1. 打开 https://script.google.com  新建项目
// 2. 将上面所有代码粘贴进去（替换原有内容）
// 3. 点击 "部署" → "新建部署"
// 4. 类型选 "Web 应用"
// 5. 执行身份：选你自己的账号
// 6. 访问权限：选 "任何人"
// 7. 点击 "部署"，复制生成的 Web 应用 URL
// 8. 把 URL 填入 main.js 里的 UPLOAD_SCRIPT_URL 变量
// =============================================
