/**
 * Калькулятор семейного бюджета
 * Данные хранятся в localStorage браузера.
 */

const STORAGE_KEYS = {
  operations: "familyBudgetOperations",
  balances: "familyBudgetBalances",
  plans: "familyBudgetPlan"
};

/** Миграция данных из старых версий проекта */
function migrateLegacyData() {
  const legacyOps = localStorage.getItem("familyBudgetOperationsPro");
  const legacyBal = localStorage.getItem("familyBudgetBalancesPro");

  if (legacyOps && !localStorage.getItem(STORAGE_KEYS.operations)) {
    localStorage.setItem(STORAGE_KEYS.operations, legacyOps);
  }
  if (legacyBal && !localStorage.getItem(STORAGE_KEYS.balances)) {
    localStorage.setItem(STORAGE_KEYS.balances, legacyBal);
  }
}

migrateLegacyData();

let operations = JSON.parse(localStorage.getItem(STORAGE_KEYS.operations)) || [];
let balances   = JSON.parse(localStorage.getItem(STORAGE_KEYS.balances))   || {};
let plans      = JSON.parse(localStorage.getItem(STORAGE_KEYS.plans))       || {};
let editId     = null;

const today        = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const currentDate  = today.toISOString().slice(0, 10);

function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatRub(value) {
  return Number(value).toLocaleString("ru-RU") + " ₽";
}

function formatDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("ru-RU");
}

function getTypeName(type) {
  const map = {
    income: "Доход",
    expense: "Расход",
    debt: "Долг / кредит",
    saving: "Накопления"
  };
  return map[type] || type;
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.operations, JSON.stringify(operations));
  localStorage.setItem(STORAGE_KEYS.balances, JSON.stringify(balances));
  localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(plans));
}

function getSelectedMonth() {
  return document.getElementById("monthFilter").value;
}

function saveStartBalance() {
  const month = getSelectedMonth();
  balances[month] = Number(document.getElementById("startBalance").value) || 0;
  saveData();
  render();
}

function savePlannedBudget() {
  const month = getSelectedMonth();
  plans[month] = Number(document.getElementById("plannedBudget").value) || 0;
  saveData();
  render();
}

function saveOperation() {
  const date     = document.getElementById("date").value;
  const type     = document.getElementById("type").value;
  const category = document.getElementById("category").value.trim();
  const amount   = Number(document.getElementById("amount").value);
  const account  = document.getElementById("account").value;
  const comment  = document.getElementById("comment").value.trim();

  if (!date) { alert("Укажите дату операции."); return; }
  if (!category) { alert("Укажите категорию."); return; }
  if (!amount || amount <= 0) { alert("Укажите корректную сумму (больше 0)."); return; }

  const item = { id: editId || Date.now(), date, type, category, amount, account, comment };

  if (editId) {
    operations = operations.map(op => op.id === editId ? item : op);
  } else {
    operations.push(item);
  }

  saveData();
  resetForm();
  render();
}

function editOperation(id) {
  const item = operations.find(op => op.id === id);
  if (!item) return;

  editId = id;
  document.getElementById("formTitle").textContent = "Редактировать операцию";
  document.getElementById("date").value = item.date;
  document.getElementById("type").value = item.type;
  document.getElementById("category").value = item.category;
  document.getElementById("amount").value = item.amount;
  document.getElementById("account").value = item.account;
  document.getElementById("comment").value = item.comment;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editId = null;
  document.getElementById("formTitle").textContent = "Добавить операцию";
  document.getElementById("date").value = currentDate;
  document.getElementById("type").value = "income";
  document.getElementById("category").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("account").value = "Наличные";
  document.getElementById("comment").value = "";
}

function deleteOperation(id) {
  if (confirm("Удалить эту операцию?")) {
    operations = operations.filter(op => op.id !== id);
    saveData();
    render();
  }
}

function clearAll() {
  if (confirm("Удалить ВСЕ операции? Это действие нельзя отменить.")) {
    operations = [];
    saveData();
    render();
  }
}

function getFilteredOperations() {
  const month      = getSelectedMonth();
  const typeFilter = document.getElementById("typeFilter").value;
  const search     = document.getElementById("search").value.toLowerCase().trim();
  const sortBy     = document.getElementById("sortBy").value;

  let list = operations.filter(op => op.date.slice(0, 7) === month);

  if (typeFilter !== "all") {
    list = list.filter(op => op.type === typeFilter);
  }

  if (search) {
    list = list.filter(op =>
      op.category.toLowerCase().includes(search) ||
      op.account.toLowerCase().includes(search) ||
      String(op.amount).includes(search) ||
      op.comment.toLowerCase().includes(search)
    );
  }

  list.sort((a, b) => {
    if (sortBy === "amount") return b.amount - a.amount;
    if (sortBy === "category") return a.category.localeCompare(b.category, "ru");
    return new Date(a.date) - new Date(b.date);
  });

  return list;
}

function render() {
  const month         = getSelectedMonth();
  const startBalance  = balances[month] || 0;
  const plannedBudget = plans[month] || 0;
  const list          = getFilteredOperations();

  document.getElementById("startBalance").value = startBalance || "";
  document.getElementById("plannedBudget").value = plannedBudget || "";
  document.getElementById("startBalanceView").textContent = formatRub(startBalance);

  let income = 0, expense = 0, debt = 0, saving = 0;
  const categoryExpenses = {};
  const accountStats = {};

  const tableBody  = document.getElementById("operationList");
  const mobileList = document.getElementById("mobileList");
  tableBody.innerHTML = "";
  mobileList.innerHTML = "";

  list.forEach(item => {
    if (item.type === "income") income += item.amount;
    if (item.type === "expense") expense += item.amount;
    if (item.type === "debt") debt += item.amount;
    if (item.type === "saving") saving += item.amount;

    if (item.type === "expense") {
      categoryExpenses[item.category] = (categoryExpenses[item.category] || 0) + item.amount;
    }

    if (!accountStats[item.account]) {
      accountStats[item.account] = { income: 0, expense: 0, debt: 0, saving: 0 };
    }
    accountStats[item.account][item.type] += item.amount;

    const cls = item.type === "income" ? "plus"
      : item.type === "saving" ? "blue"
      : item.type === "debt" ? "gold" : "minus";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${getTypeName(item.type)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td class="${cls}">${formatRub(item.amount)}</td>
      <td>${escapeHTML(item.account)}</td>
      <td>${escapeHTML(item.comment) || "—"}</td>
      <td>
        <button class="btn-edit" onclick="editOperation(${item.id})">Изменить</button>
        <button class="btn-danger" onclick="deleteOperation(${item.id})">Удалить</button>
      </td>`;
    tableBody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "operation-card";
    card.innerHTML = `
      <strong class="${cls}">${formatRub(item.amount)}</strong><br>
      ${formatDate(item.date)} · ${getTypeName(item.type)}<br>
      Категория: ${escapeHTML(item.category)}<br>
      Счёт: ${escapeHTML(item.account)}
      ${item.comment ? "<br>Комментарий: " + escapeHTML(item.comment) : ""}
      <div class="actions">
        <button class="btn-edit" onclick="editOperation(${item.id})">Изменить</button>
        <button class="btn-danger" onclick="deleteOperation(${item.id})">Удалить</button>
      </div>`;
    mobileList.appendChild(card);
  });

  if (list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-msg">Операций за этот месяц пока нет.</td></tr>';
    mobileList.innerHTML = '<p class="empty-msg">Операций за этот месяц пока нет.</p>';
  }

  const balance = startBalance + income - expense - debt - saving;

  document.getElementById("totalIncome").textContent = formatRub(income);
  document.getElementById("totalExpense").textContent = formatRub(expense);
  document.getElementById("totalDebt").textContent = formatRub(debt);
  document.getElementById("totalSaving").textContent = formatRub(saving);

  const balanceEl = document.getElementById("balance");
  balanceEl.textContent = formatRub(balance);
  balanceEl.className = balance >= 0 ? "plus" : "minus";

  renderCategoryStats(categoryExpenses, expense);
  renderAccountStats(accountStats);
  renderPlanStatus(plannedBudget, expense);
  renderAdvice(income, expense, debt, saving, balance, plannedBudget);
}

function renderCategoryStats(categoryExpenses, totalExpense) {
  const block = document.getElementById("categoryStats");
  block.innerHTML = "";

  const entries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    block.innerHTML = '<p class="empty-msg">Расходов за месяц пока нет.</p>';
    return;
  }

  entries.forEach(([category, amount]) => {
    const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    const div = document.createElement("div");
    div.className = "stat-item";
    div.innerHTML = `
      <b>${escapeHTML(category)}</b><br>
      ${formatRub(amount)} · ${percent}% от всех расходов
      <div class="progress-bg">
        <div class="progress" style="width:${percent}%"></div>
      </div>`;
    block.appendChild(div);
  });
}

function renderAccountStats(accountStats) {
  const block = document.getElementById("accountStats");
  block.innerHTML = "";

  const entries = Object.entries(accountStats);

  if (entries.length === 0) {
    block.innerHTML = '<p class="empty-msg">Операций по счетам пока нет.</p>';
    return;
  }

  entries.forEach(([account, data]) => {
    const result = data.income - data.expense - data.debt - data.saving;
    const div = document.createElement("div");
    div.className = "stat-item";
    div.innerHTML = `
      <b>${escapeHTML(account)}</b><br>
      Доход: <span class="plus">${formatRub(data.income)}</span><br>
      Расход: <span class="minus">${formatRub(data.expense)}</span><br>
      Долги: <span class="gold">${formatRub(data.debt)}</span><br>
      Накопления: <span class="blue">${formatRub(data.saving)}</span><br>
      Итог по счёту: <b class="${result >= 0 ? "plus" : "minus"}">${formatRub(result)}</b>`;
    block.appendChild(div);
  });
}

function renderPlanStatus(plannedBudget, expense) {
  const el = document.getElementById("planStatus");

  if (!plannedBudget) {
    el.style.display = "none";
    return;
  }

  el.style.display = "block";
  const percent = Math.min(Math.round((expense / plannedBudget) * 100), 100);
  const over = expense > plannedBudget;
  const left = plannedBudget - expense;

  el.innerHTML = over
    ? `План: <b>${formatRub(plannedBudget)}</b> — потрачено <b class="minus">${formatRub(expense)}</b>.
       Перерасход: <b class="minus">${formatRub(expense - plannedBudget)}</b>.`
    : `План: <b>${formatRub(plannedBudget)}</b> — потрачено <b>${formatRub(expense)}</b> (${percent}%).
       Осталось: <b class="plus">${formatRub(left)}</b>.`;

  el.innerHTML += `
    <div class="progress-bg" style="margin-top:10px">
      <div class="progress ${over ? "over" : ""}" style="width:${percent}%"></div>
    </div>`;
}

function renderAdvice(income, expense, debt, saving, balance, plannedBudget) {
  const advice = document.getElementById("advice");

  if (income === 0 && expense === 0 && debt === 0 && saving === 0) {
    advice.innerHTML = "Добавьте доходы и расходы — и здесь появится персональная рекомендация.";
    return;
  }

  const totalOut = expense + debt + saving;
  const dailyLimit = balance > 0 ? Math.floor(balance / 30) : 0;
  const savingsRate = income > 0 ? Math.round((saving / income) * 100) : 0;

  let text = "";

  if (balance > 0 && totalOut <= income * 0.7) {
    text = `Отличный результат! Бюджет устойчивый. Остаток: <b class="plus">${formatRub(balance)}</b>.`;
    if (dailyLimit > 0) {
      text += `<br>Можно тратить примерно <b>${formatRub(dailyLimit)}</b> в день до конца месяца.`;
    }
  } else if (balance > 0) {
    text = `Бюджет в плюсе (<b class="plus">${formatRub(balance)}</b>), но расходы высокие.
            Проверьте крупные категории — там часто «утекают» деньги.`;
  } else {
    text = `Бюджет в минусе на <b class="minus">${formatRub(Math.abs(balance))}</b>.
            Сократите необязательные траты или найдите дополнительный доход.`;
  }

  if (plannedBudget && expense > plannedBudget) {
    text += `<br><b class="minus">Внимание:</b> расходы превысили план на ${formatRub(expense - plannedBudget)}.`;
  }

  if (saving > 0 && income > 0) {
    text += `<br>Накопления: ${savingsRate}% от дохода — ${savingsRate >= 10 ? "хороший показатель!" : "попробуйте откладывать больше 10%."}`;
  }

  advice.innerHTML = text;
}

function exportCSV() {
  let csv = "\uFEFFДата;Тип;Категория;Сумма;Счёт;Комментарий\n";
  operations.forEach(item => {
    csv += `${item.date};${getTypeName(item.type)};${item.category};${item.amount};${item.account};${item.comment}\n`;
  });
  downloadFile(csv, "семейный-бюджет.csv", "text/csv;charset=utf-8");
}

function exportJSON() {
  const data = JSON.stringify({ operations, balances, plans }, null, 2);
  downloadFile(data, "семейный-бюджет-резерв.json", "application/json");
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.operations)) {
        alert("Неверный формат файла: отсутствует список операций.");
        return;
      }
      operations = data.operations;
      balances = data.balances || {};
      plans = data.plans || {};
      saveData();
      render();
      alert("Данные успешно восстановлены из резервной копии.");
    } catch {
      alert("Ошибка чтения файла. Убедитесь, что это корректный JSON.");
    }
    event.target.value = "";
  };

  reader.readAsText(file);
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function initCalculator() {
  document.getElementById("monthFilter").value = currentMonth;
  document.getElementById("date").value = currentDate;
  document.getElementById("monthFilter").addEventListener("change", render);
  render();
}

document.addEventListener("DOMContentLoaded", initCalculator);
