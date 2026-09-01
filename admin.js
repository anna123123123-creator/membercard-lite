(function () {
  'use strict';

  var TYPE_LABEL = { recharge: '充值', consume: '消费' };

  var data = MemberData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'members') renderMembers();
    if (name === 'transactions') renderTransactions();
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = MemberData.reset();
    switchView('dashboard');
  });

  function memberName(id) {
    var m = data.members.find(function (x) { return x.id === id; });
    return m ? m.name : '（已删除会员）';
  }

  function fmtMoney(n) { return '¥' + n.toFixed(2); }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    var totalBalance = data.members.reduce(function (sum, m) { return sum + m.balance; }, 0);

    var monthRecharge = data.transactions
      .filter(function (t) { return t.type === 'recharge' && MemberData.monthKey(t.createdAt) === ym; })
      .reduce(function (sum, t) { return sum + t.amount; }, 0);

    var monthConsume = data.transactions
      .filter(function (t) { return t.type === 'consume' && MemberData.monthKey(t.createdAt) === ym; })
      .reduce(function (sum, t) { return sum + t.amount; }, 0);

    var stats = [
      { label: '会员总数', value: data.members.length },
      { label: '储值总余额', value: fmtMoney(totalBalance) },
      { label: '本月充值总额', value: fmtMoney(monthRecharge) },
      { label: '本月消费总额', value: fmtMoney(monthConsume) },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var recent = data.transactions.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).slice(0, 8);
    document.getElementById('recentTxBody').innerHTML = recent.map(function (t) {
      var sign = t.type === 'recharge' ? '+' : '-';
      return '<tr><td>' + memberName(t.memberId) + '</td>' +
        '<td><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span></td>' +
        '<td>' + sign + fmtMoney(t.amount) + '</td><td>' + fmtMoney(t.balanceAfter) + '</td>' +
        '<td>' + t.createdAt.replace('T', ' ') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无交易</td></tr>';
  }

  // ---------- Members ----------
  var memberModalBackdrop = document.getElementById('memberModalBackdrop');
  var memberModalTitle = document.getElementById('memberModalTitle');
  var memberModalHint = document.getElementById('memberModalHint');
  var memberModalMsg = document.getElementById('memberModalMsg');
  var memberForm = document.getElementById('memberForm');
  var memberIdInput = document.getElementById('memberIdInput');
  var memberNameInput = document.getElementById('memberNameInput');
  var memberPhoneInput = document.getElementById('memberPhoneInput');
  var memberBalanceLabel = document.getElementById('memberBalanceLabel');
  var memberBalanceInput = document.getElementById('memberBalanceInput');
  var memberLevelInput = document.getElementById('memberLevelInput');

  var LEVEL_CLASS = { '普通': 'level-normal', '银卡': 'level-silver', '金卡': 'level-gold' };

  function renderMembers() {
    document.getElementById('membersBody').innerHTML = data.members.map(function (m) {
      return '<tr><td>' + m.name + '</td><td>' + m.phone + '</td>' +
        '<td><span class="badge level ' + (LEVEL_CLASS[m.level] || 'level-normal') + '">' + m.level + '</span></td>' +
        '<td>' + fmtMoney(m.balance) + '</td><td>' + m.joinedDate + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + m.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + m.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:var(--muted)">暂无会员</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMemberModal(btn.dataset.edit); });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteMember(btn.dataset.delete); });
    });
  }

  function openMemberModal(id) {
    memberModalMsg.innerHTML = '';
    memberForm.reset();
    if (id) {
      var m = data.members.find(function (x) { return x.id === id; });
      memberModalTitle.textContent = '编辑会员';
      memberModalHint.textContent = '可直接修正余额用于人工调整，不会生成充值/消费交易记录。';
      memberBalanceLabel.textContent = '当前余额（元）';
      memberIdInput.value = m.id;
      memberNameInput.value = m.name;
      memberPhoneInput.value = m.phone;
      memberBalanceInput.value = m.balance;
      memberLevelInput.value = m.level;
    } else {
      memberModalTitle.textContent = '新增会员';
      memberModalHint.textContent = '若填写初始余额大于 0，会自动生成一笔"开卡充值"交易记录。';
      memberBalanceLabel.textContent = '初始余额（元）';
      memberIdInput.value = '';
      memberBalanceInput.value = '0';
      memberLevelInput.value = '普通';
    }
    memberModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddMember').addEventListener('click', function () { openMemberModal(null); });
  document.getElementById('btnCloseMemberModal').addEventListener('click', function () { memberModalBackdrop.classList.remove('show'); });
  memberModalBackdrop.addEventListener('click', function (e) { if (e.target === memberModalBackdrop) memberModalBackdrop.classList.remove('show'); });

  memberForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = memberNameInput.value.trim();
    var phone = memberPhoneInput.value.trim();
    var balance = parseFloat(memberBalanceInput.value);
    var level = memberLevelInput.value;

    if (!name || !phone || !(balance >= 0)) {
      memberModalMsg.innerHTML = '<div class="msg error">请完整填写姓名、手机号，余额不能为负数。</div>';
      return;
    }

    var id = memberIdInput.value;
    if (id) {
      var m = data.members.find(function (x) { return x.id === id; });
      m.name = name; m.phone = phone; m.balance = MemberData.round2(balance); m.level = level;
    } else {
      var newBalance = MemberData.round2(balance);
      var newMember = {
        id: MemberData.uid('m'), name: name, phone: phone, balance: newBalance, level: level,
        joinedDate: MemberData.now().slice(0, 10),
      };
      data.members.push(newMember);
      if (newBalance > 0) {
        data.transactions.push({
          id: MemberData.uid('t'), memberId: newMember.id, type: 'recharge',
          amount: newBalance, balanceAfter: newBalance, note: '开卡充值', createdAt: MemberData.now(),
        });
      }
    }
    MemberData.save(data);
    memberModalBackdrop.classList.remove('show');
    renderMembers();
  });

  function deleteMember(id) {
    if (!confirm('确定删除这个会员吗？关联的交易记录会保留但会显示"已删除会员"。')) return;
    data.members = data.members.filter(function (m) { return m.id !== id; });
    MemberData.save(data);
    renderMembers();
  }

  // ---------- Transactions ----------
  var currentFilter = 'all';
  document.querySelectorAll('#txFilters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentFilter = btn.dataset.type;
      document.querySelectorAll('#txFilters .filter-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderTransactions();
    });
  });

  function renderTransactions() {
    var list = data.transactions.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    if (currentFilter !== 'all') list = list.filter(function (t) { return t.type === currentFilter; });

    document.getElementById('txBody').innerHTML = list.map(function (t) {
      var sign = t.type === 'recharge' ? '+' : '-';
      return '<tr><td>' + memberName(t.memberId) + '</td>' +
        '<td><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span></td>' +
        '<td>' + sign + fmtMoney(t.amount) + '</td><td>' + fmtMoney(t.balanceAfter) + '</td>' +
        '<td>' + (t.note || '-') + '</td><td>' + t.createdAt.replace('T', ' ') + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:var(--muted)">暂无交易记录</td></tr>';
  }

  switchView('dashboard');
})();
