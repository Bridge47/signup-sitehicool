const STORAGE_KEY = "signup_applications_v2";

// ===== 洲 → 国家映射 =====
const CONTINENT_COUNTRIES = {
  亚洲: [
    "中国", "日本", "韩国", "印度", "新加坡", "马来西亚", "泰国", "印度尼西亚",
    "越南", "菲律宾", "柬埔寨", "缅甸", "巴基斯坦", "孟加拉国", "斯里兰卡",
    "尼泊尔", "以色列", "沙特阿拉伯", "阿联酋", "土耳其", "其他亚洲国家"
  ],
  欧洲: [
    "英国", "德国", "法国", "荷兰", "瑞典", "挪威", "丹麦", "芬兰",
    "瑞士", "奥地利", "比利时", "西班牙", "意大利", "葡萄牙", "波兰",
    "捷克", "匈牙利", "爱尔兰", "卢森堡", "希腊", "其他欧洲国家"
  ],
  北美洲: [
    "美国", "加拿大", "墨西哥", "哥斯达黎加", "巴拿马", "古巴", "其他北美洲国家"
  ],
  南美洲: [
    "巴西", "阿根廷", "智利", "哥伦比亚", "秘鲁", "乌拉圭", "厄瓜多尔",
    "玻利维亚", "巴拉圭", "委内瑞拉", "其他南美洲国家"
  ],
  非洲: [
    "南非", "尼日利亚", "肯尼亚", "埃及", "埃塞俄比亚", "加纳", "坦桑尼亚",
    "乌干达", "摩洛哥", "突尼斯", "其他非洲国家"
  ],
  大洋洲: [
    "澳大利亚", "新西兰", "新加坡（大洋洲周边）", "巴布亚新几内亚", "其他大洋洲国家"
  ],
};

// ★ 部署 Apps Script 后，把 URL 填在这里
const UPLOAD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4slRDf2fSC_muzYj9l6S9lm2GHdglXRlQ-h5bybDfRvg-eDmtsWbvy_BqUCLS9b2h2A/exec";

const form = document.getElementById("signupForm");
const toast = document.getElementById("toast");
const listEl = document.getElementById("list");

const resetBtn   = document.getElementById("resetBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const submitBtn  = document.getElementById("submitBtn");
const nextBtn    = document.getElementById("nextBtn");
const next2Btn   = document.getElementById("next2Btn");
const prevBtn    = document.getElementById("prevBtn");
const prev2Btn   = document.getElementById("prev2Btn");

// ===== 步骤切换 =====
const step1El = document.getElementById("step1");
const step2El = document.getElementById("step2");
const step3El = document.getElementById("step3");
const ind1    = document.getElementById("step-indicator-1");
const ind2    = document.getElementById("step-indicator-2");
const ind3    = document.getElementById("step-indicator-3");

function goToStep(n) {
  [step1El, step2El, step3El].forEach(el => el.style.display = "none");
  [ind1, ind2, ind3].forEach(el => el.classList.remove("active"));
  if (n === 1) { step1El.style.display = ""; ind1.classList.add("active"); }
  if (n === 2) { step2El.style.display = ""; ind2.classList.add("active"); }
  if (n === 3) { step3El.style.display = ""; ind3.classList.add("active"); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== 下一步：两阶段逻辑 =====
// phase: "idle" | "confirmed"
let nextBtnPhase = "idle";

function resetNextBtn() {
  nextBtnPhase = "idle";
  nextBtn.textContent = "下一步";
}

nextBtn.addEventListener("click", () => {
  const data = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    companyLocation: form.companyLocation.value,
    companyName: (form.companyName?.value || "").trim(),
    companyNameOverseas: (form.companyNameOverseas?.value || "").trim(),
    officeAddress: (form.officeAddress?.value || "").trim(),
    continent: continentSel.value,
    country: countrySel.value,
    continent2: continent2Sel.value,
    country2: country2Sel.value,
    agree: true,
  };
  if (!validate(data, false)) {
    showToast("请先修正表单提示内容");
    return;
  }

  if (nextBtnPhase === "idle") {
    // 第一次点击：弹出方块 + 自动选期别 + 改按钮文字
    const allCompanyName = data.companyName || data.companyNameOverseas;
    applyPhaseRule(allCompanyName, data.companyLocation);
    selectionBox.style.display = "";
    selectionBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    nextBtnPhase = "confirmed";
    nextBtn.textContent = "已确定，下一步";
  } else {
    // 第二次点击：跳转
    goToStep(2);
  }
});

prevBtn.addEventListener("click", () => goToStep(1));

// 第二步 → 第三步
next2Btn.addEventListener("click", () => {
  // 校验第二步文本域
  const d = {
    projOverview: (form.projOverview?.value || "").trim(),
    projFeature:  (form.projFeature?.value  || "").trim(),
    projMarket:   (form.projMarket?.value   || "").trim(),
  };
  let ok = true;
  function chk(f, label) {
    const len = d[f].length;
    if (len < 5)        { setError(f, `${label}至少需要 5 字`);   ok = false; }
    else if (len > 200) { setError(f, `${label}不能超过 200 字`); ok = false; }
    else                { setError(f, ""); }
  }
  chk("projOverview", "项目概况");
  chk("projFeature",  "产品/服务特点");
  chk("projMarket",   "项目市场化能力");
  if (!ok) { showToast("请先修正表单提示内容"); return; }
  goToStep(3);
});

prev2Btn.addEventListener("click", () => goToStep(2));

// ===== 洲/国家联动（通用工厂函数）=====
function bindContinentCountry(continentEl, countryEl) {
  continentEl.addEventListener("change", () => {
    const val = continentEl.value;
    if (!val) {
      countryEl.innerHTML = '<option value="">请先选择洲…</option>';
      countryEl.disabled = true;
      return;
    }
    const countries = CONTINENT_COUNTRIES[val] || [];
    countryEl.innerHTML = '<option value="">请选择国家…</option>' +
      countries.map(c => `<option value="${c}">${c}</option>`).join("");
    countryEl.disabled = false;
  });
}

const continentSel  = document.getElementById("continent");
const countrySel    = document.getElementById("country");
const continent2Sel = document.getElementById("continent2");
const country2Sel   = document.getElementById("country2");

bindContinentCountry(continentSel,  countrySel);
bindContinentCountry(continent2Sel, country2Sel);

// ===== 条件面板显示/隐藏 =====
const panelMainland  = document.getElementById("panel-mainland");
const panelOverseas  = document.getElementById("panel-overseas");
const panelNocompany = document.getElementById("panel-nocompany");

function showPanel(value) {
  panelMainland.style.display  = value === "在中国大陆"      ? "" : "none";
  panelOverseas.style.display  = value === "在海外（含港澳台）" ? "" : "none";
  panelNocompany.style.display = value === "尚未成立公司"     ? "" : "none";
}

document.querySelectorAll('input[name="companyLocation"]').forEach(radio => {
  radio.addEventListener("change", () => {
    showPanel(radio.value);
    // 隐藏方块，重置按钮状态
    selectionBox.style.display = "none";
    resetNextBtn();
    // 重置期别/组别选中状态
    [phaseGrowth, phaseMaker, groupOverseas, groupLocal].forEach(b => {
      b.classList.remove("active", "disabled");
      b.disabled = false;
    });
    selectedPhaseInput.value = "";
    selectedGroupInput.value = "";
    document.getElementById("phaseGrowthWarn").style.display = "none";
    document.getElementById("phaseMakerWarn").style.display  = "none";
  });
});

// ===== 期别 & 组别选择逻辑 =====
const selectionBox   = document.getElementById("selectionBox");
const phaseGrowth    = document.getElementById("phaseGrowth");
const phaseMaker   = document.getElementById("phaseMaker");
const groupOverseas = document.getElementById("groupOverseas");
const groupLocal   = document.getElementById("groupLocal");
const selectedPhaseInput = document.getElementById("selectedPhase");
const selectedGroupInput = document.getElementById("selectedGroup");

function setSegActive(btn, input) {
  const group = btn.closest(".seg-cards");
  group.querySelectorAll(".seg-card-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  input.value = btn.dataset.value;
}

// 期别：互斥点击（禁用的不响应）
[phaseGrowth, phaseMaker].forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    setSegActive(btn, selectedPhaseInput);
  });
});

// 组别：自由切换
[groupOverseas, groupLocal].forEach(btn => {
  btn.addEventListener("click", () => setSegActive(btn, selectedGroupInput));
});

// 根据公司名自动设置期别
function applyPhaseRule(companyName, companyLocation) {
  const isMainland = companyLocation === "在中国大陆";
  const isBeijing  = isMainland && companyName && companyName.includes("北京");

  const growthWarn = document.getElementById("phaseGrowthWarn");
  const makerWarn  = document.getElementById("phaseMakerWarn");

  if (isBeijing) {
    // 大陆 + 含"北京" → 成长期，禁用创客期
    setSegActive(phaseGrowth, selectedPhaseInput);
    phaseMaker.disabled = true;
    phaseMaker.classList.add("disabled");
    phaseGrowth.disabled = false;
    phaseGrowth.classList.remove("disabled");
    growthWarn.style.display = "none";
    makerWarn.style.display  = "";
  } else {
    // 大陆不含"北京" / 海外 / 尚未成立 → 创客期，禁用成长期
    setSegActive(phaseMaker, selectedPhaseInput);
    phaseGrowth.disabled = true;
    phaseGrowth.classList.add("disabled");
    phaseMaker.disabled = false;
    phaseMaker.classList.remove("disabled");
    growthWarn.style.display = "";
    makerWarn.style.display  = "none";
  }
}

// ===== 字数统计 =====
function bindCharCount(textareaId, countId) {
  const ta = document.getElementById(textareaId);
  const ct = document.getElementById(countId);
  function update() {
    const len = ta.value.length;
    ct.textContent = `已输入 ${len} 字`;
    ct.style.color = (len > 0 && len < 5) || len > 200 ? "#ff6b6b" : "var(--muted)";
  }
  ta.addEventListener("input", update);
}
bindCharCount("projOverview", "projOverviewCount");
bindCharCount("projFeature",  "projFeatureCount");
bindCharCount("projMarket",   "projMarketCount");

// ===== PDF 上传区域逻辑 =====
const uploadZone = document.getElementById("uploadZone");
const uploadInput = document.getElementById("pdfFile");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const uploadPreview = document.getElementById("uploadPreview");
const uploadFileName = document.getElementById("uploadFileName");
const uploadRemove = document.getElementById("uploadRemove");

let selectedPdfFile = null;
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

function setPdfFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf") {
    setError("pdfFile", "只支持 PDF 格式");
    return;
  }
  if (file.size > MAX_PDF_SIZE) {
    setError("pdfFile", "文件超过 10MB，请压缩后再上传");
    return;
  }
  setError("pdfFile", "");
  selectedPdfFile = file;
  uploadFileName.textContent = file.name + "（" + (file.size / 1024).toFixed(0) + " KB）";
  uploadPlaceholder.style.display = "none";
  uploadPreview.style.display = "flex";
}

uploadInput.addEventListener("change", () => {
  if (uploadInput.files[0]) setPdfFile(uploadInput.files[0]);
});

uploadRemove.addEventListener("click", () => {
  selectedPdfFile = null;
  uploadInput.value = "";
  uploadPreview.style.display = "none";
  uploadPlaceholder.style.display = "flex";
  setError("pdfFile", "");
});

// 拖拽支持
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) setPdfFile(file);
});

// ===== 上传 PDF 到 Google Drive via Apps Script =====
async function uploadPdfToDrive(file, applicantName, email) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1]; // 去掉 data:...;base64, 前缀
      const safeFileName = applicantName.replace(/[^\w\u4e00-\u9fa5]/g, "_") + "_" + file.name;
      try {
        const resp = await fetch(UPLOAD_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            fileName: safeFileName,
            fileData: base64,
            applicantName,
            email,
          }),
        });
        const result = await resp.json();
        if (result.success) {
          resolve(result.fileUrl);
        } else {
          reject(new Error(result.error || "上传失败"));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

// ===== 提交表单数据到 Google Drive（写入 Sheets）=====
async function submitFormDataToDrive(data, pdfUrl) {
  const payload = {
    type: "formData",
    ...data,
    pdfUrl,
    educationList: expState.educationList,
    workList:      expState.workList,
  };
  const resp = await fetch(UPLOAD_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const result = await resp.json();
  if (!result.success) throw new Error(result.error || "表单数据保存失败");
}

// ===== Toast 提示 =====
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.style.display = "none"), 2400);
}

// ===== 提交到 Google Forms（隐藏 form POST，避免 CORS）=====
function submitToGoogleForms(data) {
  const FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSeBwc_hPwgpujlzuOF2Wi5dVQVbGeLi6YeAdAH0neRrqZhUBQ/formResponse";

  // 建一个隐藏 iframe 作为提交目标，避免页面跳转
  let iframe = document.getElementById("hidden_iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = "hidden_iframe";
    iframe.id = "hidden_iframe";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }

  // 创建一个临时 form 来提交
  const f = document.createElement("form");
  f.action = FORM_URL;
  f.method = "POST";
  f.target = "hidden_iframe";

  const add = (name, value) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    f.appendChild(input);
  };

  // 你的 entry 映射（来自你提供的预填充链接）
  add("entry.23582397", data.fullName);          // 姓名
  add("entry.645846661", data.email);            // 邮箱
  add("entry.808745371", data.phone);            // 手机
  add("entry.186133713", data.companyLocation);  // 项目所属公司
  // 地区：取实际填写的那组
  const regionStr = data.continent && data.country
    ? data.continent + " - " + data.country
    : data.continent2 && data.country2
      ? data.continent2 + " - " + data.country2
      : "";
  add("entry.122601716", regionStr);

  document.body.appendChild(f);
  f.submit();
  f.remove();
}

// ===== localStorage 读写 =====
function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ===== 表单错误提示 =====
function setError(name, message) {
  const el = document.querySelector(`[data-error-for="${name}"]`);
  if (el) el.textContent = message || "";
}

function clearErrors() {
  ["fullName", "email", "phone", "companyLocation", "companyName", "companyNameOverseas",
   "officeAddress", "region", "region2", "selectionBox",
   "projOverview", "projFeature", "projMarket",
   "idNumber", "personalBio",
   "eduList", "workList", "agree", "pdfFile"].forEach((k) => setError(k, ""));
}

// ===== 校验逻辑 =====
function validate(data, checkAgree = true) {
  clearErrors();
  let ok = true;

  if (!data.fullName || data.fullName.trim().length < 2) {
    setError("fullName", "请输入至少 2 个字的姓名");
    ok = false;
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    setError("email", "请输入有效邮箱");
    ok = false;
  }

  if (!data.companyLocation) {
    setError("companyLocation", "请选择项目所属公司情况");
    ok = false;
  }

  if (data.companyLocation === "在中国大陆") {
    if (!data.companyName) {
      setError("companyName", "请输入公司名称");
      ok = false;
    }
  }

  if (data.companyLocation === "在海外（含港澳台）") {
    if (!data.continent) {
      setError("region", "请选择所在洲");
      ok = false;
    } else if (!data.country) {
      setError("region", "请选择所在国家");
      ok = false;
    }
    if (!data.companyNameOverseas) {
      setError("companyNameOverseas", "请输入公司名称");
      ok = false;
    }
    if (!data.officeAddress) {
      setError("officeAddress", "请输入办公地址");
      ok = false;
    }
  }

  if (data.companyLocation === "尚未成立公司") {
    if (!data.continent2) {
      setError("region2", "请选择所在洲");
      ok = false;
    } else if (!data.country2) {
      setError("region2", "请选择所在国家");
      ok = false;
    }
  }

  if (checkAgree && !selectedGroupInput.value) {
    setError("selectionBox", "请选择组别");
    ok = false;
  }

  function checkTextArea(fieldName, label) {
    const len = (data[fieldName] || "").length;
    if (len < 5)        { setError(fieldName, `${label}至少需要 5 字`);   ok = false; }
    else if (len > 200) { setError(fieldName, `${label}不能超过 200 字`); ok = false; }
  }
  if (checkAgree) {
    checkTextArea("projOverview", "项目概况");
    checkTextArea("projFeature",  "产品/服务特点");
    checkTextArea("projMarket",   "项目市场化能力");
  }

  if (checkAgree && (!data.idNumber || !data.idNumber.trim())) {
    setError("idNumber", "请输入身份证号");
    ok = false;
  }

  if (checkAgree && (!data.personalBio || !data.personalBio.trim())) {
    setError("personalBio", "请填写个人简介及荣誉");
    ok = false;
  }

  if (checkAgree && expState.educationList.length === 0) {
    setError("eduList", "请至少添加一条教育经历");
    ok = false;
  }

  if (checkAgree && expState.hasWorkExperience && expState.workList.length === 0) {
    setError("workList", "请至少添加一条工作经历，或选择「无工作经历」");
    ok = false;
  }

  if (checkAgree && !data.agree) {
    setError("agree", "必须勾选同意才能提交");
    ok = false;
  }

  if (data.phone && !/^[0-9+\-\s()]{6,}$/.test(data.phone)) {
    setError("phone", "手机号格式看起来不太对（可不填）");
    ok = false;
  }

  return ok;
}

// ===== 安全输出（防 XSS）=====
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== 渲染本机提交记录 =====
function render() {
  const items = loadAll();
  if (items.length === 0) {
    listEl.innerHTML = `<p class="muted">暂无记录</p>`;
    return;
  }

  listEl.innerHTML = items
    .slice()
    .reverse()
    .map((it) => {
      return `
        <div class="item">
          <div class="top">
            <div>
              <strong>${escapeHtml(it.fullName)}</strong>
              <span class="badge">${escapeHtml(it.companyLocation || it.track || "")}</span>
            </div>
            <div class="badge">${new Date(it.createdAt).toLocaleString()}</div>
          </div>
          <div class="muted" style="margin-top:8px;">
            邮箱：${escapeHtml(it.email)} ${it.phone ? `｜ 手机：${escapeHtml(it.phone)}` : ""}
            ${it.continent && it.country ? `｜ 所在地：${escapeHtml(it.continent)} - ${escapeHtml(it.country)}` : ""}
            ${it.pdfUrl ? `｜ <a href="${escapeHtml(it.pdfUrl)}" target="_blank" style="color:var(--primary);">查看附件</a>` : ""}
            ${it.pdfName && !it.pdfUrl ? `｜ 附件：${escapeHtml(it.pdfName)}（上传失败）` : ""}
          </div>
          ${it.about ? `<div style="margin-top:10px; white-space:pre-wrap; line-height:1.5;">${escapeHtml(it.about)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

// ===== 表单提交监听 =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    companyLocation: form.companyLocation.value,
    companyName: (form.companyName?.value || "").trim(),
    companyNameOverseas: (form.companyNameOverseas?.value || "").trim(),
    officeAddress: (form.officeAddress?.value || "").trim(),
    continent: continentSel.value,
    country: countrySel.value,
    continent2: continent2Sel.value,
    country2: country2Sel.value,
    phase: selectedPhaseInput.value,
    group: selectedGroupInput.value,
    projOverview: (form.projOverview?.value || "").trim(),
    projFeature:  (form.projFeature?.value  || "").trim(),
    projMarket:   (form.projMarket?.value   || "").trim(),
    idNumber:     (form.idNumber?.value     || "").trim(),
    personalBio:  (form.personalBio?.value  || "").trim(),
    agree: form.agree.checked,
  };

  if (!validate(data)) {
    showToast("请先修正表单提示内容");
    return;
  }

  submitBtn.disabled = true;
  showToast("提交中，请稍候…");

  // ① 上传 PDF（如果有）
  let pdfUrl = "";
  if (selectedPdfFile) {
    try {
      showToast("正在上传附件…");
      pdfUrl = await uploadPdfToDrive(selectedPdfFile, data.fullName, data.email);
    } catch (err) {
      console.error("PDF 上传失败：", err);
      setError("pdfFile", "附件上传失败，请检查网络后重试（或不上传直接提交）");
      showToast("附件上传失败 ❌");
      submitBtn.disabled = false;
      return;
    }
  }

  // ② 提交到 Google Forms（含 PDF 链接）
  try {
    submitToGoogleForms({ ...data, pdfUrl });
  } catch (err) {
    console.error("提交到 Google Forms 失败：", err);
    showToast("提交失败 ❌ 请稍后重试");
    submitBtn.disabled = false;
    return;
  }

  // ③ 保存表单数据到 Google Drive（Sheets）
  try {
    showToast("正在保存报名数据…");
    await submitFormDataToDrive(data, pdfUrl);
  } catch (err) {
    console.error("数据保存失败：", err);
    // 不阻断流程，仅提示
    showToast("报名数据云端保存失败，但本地记录已保留 ⚠️");
  }

  // ③ 保存到本机
  const item = {
    ...data,
    agree: undefined,
    pdfUrl,
    pdfName: selectedPdfFile ? selectedPdfFile.name : "",
    createdAt: Date.now(),
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  };

  const items = loadAll();
  items.push(item);
  saveAll(items);

  form.reset();
  clearErrors();
  selectedPdfFile = null;
  uploadPreview.style.display = "none";
  uploadPlaceholder.style.display = "flex";
  [countrySel, country2Sel].forEach(sel => {
    sel.innerHTML = '<option value="">请先选择洲…</option>';
    sel.disabled = true;
  });
  showPanel("");
  goToStep(1);
  [phaseGrowth, phaseMaker, groupOverseas, groupLocal].forEach(b => {
    b.classList.remove("active", "disabled");
    b.disabled = false;
  });
  selectedPhaseInput.value = "";
  selectedGroupInput.value = "";
  document.getElementById("phaseGrowthWarn").style.display = "none";
  document.getElementById("phaseMakerWarn").style.display  = "none";

  showToast(pdfUrl ? "提交成功 ✅ 附件已上传到 Google Drive" : "提交成功 ✅");
  render();
  submitBtn.disabled = false;
});

// ===== 清空表单 =====
resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  [countrySel, country2Sel].forEach(sel => {
    sel.innerHTML = '<option value="">请先选择洲…</option>';
    sel.disabled = true;
  });
  showPanel("");
  goToStep(1);
  // 重置期别/组别
  [phaseGrowth, phaseMaker, groupOverseas, groupLocal].forEach(b => {
    b.classList.remove("active", "disabled");
    b.disabled = false;
  });
  selectedPhaseInput.value = "";
  selectedGroupInput.value = "";
  document.getElementById("phaseGrowthWarn").style.display = "none";
  document.getElementById("phaseMakerWarn").style.display  = "none";
  showToast("已清空表单");
});

// ===== 清空本机记录 =====
clearAllBtn.addEventListener("click", () => {
  saveAll([]);
  render();
  showToast("已清空本机记录");
});

// ===== 第三步：教育 & 工作经历 =====
const expState = {
  educationList: [],
  hasWorkExperience: true,
  workList: [],
};

// ---- 通用弹窗工具 ----
function openModal(id)  { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
function modalSetError(key, msg) {
  const el = document.querySelector(`#${key.startsWith("edu") || key.startsWith("work") ? (key.includes("Time") || key.includes("School") || key.includes("Degree") || key.includes("Major") || key.includes("Country") || key.includes("Company") || key.includes("Position") ? "" : "") : ""}[data-error-for="${key}"]`);
  if (el) el.textContent = msg || "";
}

// ---- 教育经历 ----
const eduModal    = document.getElementById("eduModal");
const eduTbody    = document.getElementById("eduTbody");
const eduEmptyRow = document.getElementById("eduEmptyRow");

function renderEduTable() {
  // 清空非空行
  Array.from(eduTbody.querySelectorAll("tr:not(#eduEmptyRow)")).forEach(r => r.remove());
  if (expState.educationList.length === 0) {
    eduEmptyRow.style.display = "";
    return;
  }
  eduEmptyRow.style.display = "none";
  expState.educationList.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const timeStr = item.startDate + " — " + (item.isCurrent ? "至今" : item.endDate);
    tr.innerHTML = `
      <td>${escapeHtml(timeStr)}</td>
      <td>${escapeHtml(item.school)}</td>
      <td>${escapeHtml(item.degree)}</td>
      <td>${escapeHtml(item.major)}</td>
      <td>${escapeHtml(item.country)}</td>
      <td><button type="button" class="exp-del-btn" data-idx="${idx}">删除</button></td>`;
    eduTbody.appendChild(tr);
  });
  eduTbody.querySelectorAll(".exp-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      expState.educationList.splice(Number(btn.dataset.idx), 1);
      renderEduTable();
    });
  });
}

document.getElementById("addEduBtn").addEventListener("click", () => {
  // 清空字段
  ["eduStart","eduEnd","eduSchool","eduDegree","eduMajor","eduCountry"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("eduIsCurrent").checked = false;
  document.getElementById("eduEnd").style.display = "";
  ["eduTime","eduSchool","eduDegree","eduMajor","eduCountry"].forEach(k => {
    const el = eduModal.querySelector(`[data-error-for="${k}"]`);
    if (el) el.textContent = "";
  });
  openModal("eduModal");
});

document.getElementById("eduIsCurrent").addEventListener("change", function() {
  document.getElementById("eduEnd").style.display = this.checked ? "none" : "";
});

document.getElementById("cancelEduBtn").addEventListener("click", () => closeModal("eduModal"));
eduModal.addEventListener("click", e => { if (e.target === eduModal) closeModal("eduModal"); });

document.getElementById("saveEduBtn").addEventListener("click", () => {
  const startDate  = document.getElementById("eduStart").value;
  const isCurrent  = document.getElementById("eduIsCurrent").checked;
  const endDate    = document.getElementById("eduEnd").value;
  const school     = document.getElementById("eduSchool").value.trim();
  const degree     = document.getElementById("eduDegree").value;
  const major      = document.getElementById("eduMajor").value.trim();
  const country    = document.getElementById("eduCountry").value;
  let ok = true;

  const err = (key, msg) => {
    const el = eduModal.querySelector(`[data-error-for="${key}"]`);
    if (el) el.textContent = msg;
    ok = false;
  };
  const clr = (key) => {
    const el = eduModal.querySelector(`[data-error-for="${key}"]`);
    if (el) el.textContent = "";
  };

  if (!startDate) err("eduTime", "请选择开始时间");
  else if (!isCurrent && !endDate) err("eduTime", "请选择结束时间或勾选「至今」");
  else clr("eduTime");

  if (!school) err("eduSchool", "请输入学校名称"); else clr("eduSchool");
  if (!degree) err("eduDegree", "请选择学位");     else clr("eduDegree");
  if (!major)  err("eduMajor",  "请输入专业");      else clr("eduMajor");
  if (!country) err("eduCountry","请选择国家或地区"); else clr("eduCountry");

  if (!ok) return;

  expState.educationList.push({ startDate, endDate: isCurrent ? "" : endDate, isCurrent, school, degree, major, country });
  renderEduTable();
  closeModal("eduModal");
  setError("eduList", "");
});

// ---- 工作经历 ----
const workModal    = document.getElementById("workModal");
const workTbody    = document.getElementById("workTbody");
const workEmptyRow = document.getElementById("workEmptyRow");
const workTableArea = document.getElementById("workTableArea");

function renderWorkTable() {
  Array.from(workTbody.querySelectorAll("tr:not(#workEmptyRow)")).forEach(r => r.remove());
  if (expState.workList.length === 0) {
    workEmptyRow.style.display = "";
    return;
  }
  workEmptyRow.style.display = "none";
  expState.workList.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const timeStr = item.startDate + " — " + (item.isCurrent ? "至今" : item.endDate);
    tr.innerHTML = `
      <td>${escapeHtml(timeStr)}</td>
      <td>${escapeHtml(item.company)}</td>
      <td>${escapeHtml(item.position)}</td>
      <td>${escapeHtml(item.country)}</td>
      <td><button type="button" class="exp-del-btn" data-idx="${idx}">删除</button></td>`;
    workTbody.appendChild(tr);
  });
  workTbody.querySelectorAll(".exp-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      expState.workList.splice(Number(btn.dataset.idx), 1);
      renderWorkTable();
    });
  });
}

document.querySelectorAll('input[name="hasWork"]').forEach(radio => {
  radio.addEventListener("change", () => {
    expState.hasWorkExperience = radio.value === "yes";
    workTableArea.style.display = expState.hasWorkExperience ? "" : "none";
    if (!expState.hasWorkExperience) {
      expState.workList = [];
      renderWorkTable();
    }
    setError("workList", "");
  });
});

document.getElementById("addWorkBtn").addEventListener("click", () => {
  ["workStart","workEnd","workCompany","workPosition","workCountry"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("workIsCurrent").checked = false;
  document.getElementById("workEnd").style.display = "";
  ["workTime","workCompany","workPosition","workCountry"].forEach(k => {
    const el = workModal.querySelector(`[data-error-for="${k}"]`);
    if (el) el.textContent = "";
  });
  openModal("workModal");
});

document.getElementById("workIsCurrent").addEventListener("change", function() {
  document.getElementById("workEnd").style.display = this.checked ? "none" : "";
});

document.getElementById("cancelWorkBtn").addEventListener("click", () => closeModal("workModal"));
workModal.addEventListener("click", e => { if (e.target === workModal) closeModal("workModal"); });

document.getElementById("saveWorkBtn").addEventListener("click", () => {
  const startDate  = document.getElementById("workStart").value;
  const isCurrent  = document.getElementById("workIsCurrent").checked;
  const endDate    = document.getElementById("workEnd").value;
  const company    = document.getElementById("workCompany").value.trim();
  const position   = document.getElementById("workPosition").value.trim();
  const country    = document.getElementById("workCountry").value;
  let ok = true;

  const err = (key, msg) => {
    const el = workModal.querySelector(`[data-error-for="${key}"]`);
    if (el) el.textContent = msg;
    ok = false;
  };
  const clr = (key) => {
    const el = workModal.querySelector(`[data-error-for="${key}"]`);
    if (el) el.textContent = "";
  };

  if (!startDate) err("workTime", "请选择开始时间");
  else if (!isCurrent && !endDate) err("workTime", "请选择结束时间或勾选「至今」");
  else clr("workTime");

  if (!company)  err("workCompany",  "请输入工作单位"); else clr("workCompany");
  if (!position) err("workPosition", "请输入担任职务"); else clr("workPosition");
  if (!country)  err("workCountry",  "请选择国家或地区"); else clr("workCountry");

  if (!ok) return;

  expState.workList.push({ startDate, endDate: isCurrent ? "" : endDate, isCurrent, company, position, country });
  renderWorkTable();
  closeModal("workModal");
  setError("workList", "");
});

// 初始渲染
render();