(function () {
  'use strict';

  var LEVEL_CLASS = { '普通': 'level-normal', '银卡': 'level-silver', '金卡': 'level-gold' };
  var TYPE_LABEL = { recharge: '充值', consume: '消费' };

  var phoneInput = document.getElementById('phoneInput');
  var btnSearch = document.getElementById('btnSearch');
  var searchMsg = document.getElementById('searchMsg');
  var memberCard = document.getElementById('memberCard');
  var mName = document.getElementById('mName');
  var mPhone = document.getElementById('mPhone');
  var mLevel = document.getElementById('mLevel');
  var mBalance = document.getElementById('mBalance');
  var txBody = document.getElementById('txBody');

  var btnOpenRecharge = document.getElementById('btnOpenRecharge');
  var btnOpenConsume = document.getElementById('btnOpenConsume');

  var rechargeModalBackdrop = document.getElementById('rechargeModalBackdrop');
  var btnCloseRecharge = document.getElementById('btnCloseRecharge');
  var rechargeSub = document.getElementById('rechargeSub');
  var rechargeMsg = document.getElementById('rechargeMsg');
  var rechargeForm = document.getElementById('rechargeForm');
  var rechargeAmountInput = document.getElementById('rechargeAmountInput');
  var rechargeNoteInput = document.getElementById('rechargeNoteInput');

  var consumeModalBackdrop = document.getElementById('consumeModalBackdrop');
  var btnCloseConsume = document.getElementById('btnCloseConsume');
  var consumeSub = document.getElementById('consumeSub');
  var consumeMsg = document.getElementById('consumeMsg');
  var consumeForm = document.getElementById('consumeForm');
  var consumeAmountInput = document.getElementById('consumeAmountInput');
  var consumeNoteInput = document.getElementById('consumeNoteInput');

  var data = MemberData.load();
  var currentMember = null;

  function fmtMoney(n) {
    return '¥' + n.toFixed(2);
  }

  function findByPhone(query) {
    query = query.trim();
    if (!query) return null;
    var exact = data.members.find(function (m) { return m.phone === query; });
    if (exact) return exact;
    if (query.length >= 3) {
      return data.members.find(function (m) { return m.phone.indexOf(query) !== -1; }) || null;
    }
    return null;
  }

  function renderTxList() {
    var list = data.transactions
      .filter(function (t) { return t.memberId === currentMember.id; })
      .slice()
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
      .slice(0, 8);

    txBody.innerHTML = list.map(function (t) {
      var sign = t.type === 'recharge' ? '+' : '-';
      return '<tr><td>' + t.createdAt.replace('T', ' ') + '</td>' +
        '<td><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span></td>' +
        '<td>' + sign + fmtMoney(t.amount) + '</td>' +
        '<td>' + fmtMoney(t.balanceAfter) + '</td>' +
        '<td>' + (t.note || '-') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无交易记录</td></tr>';
  }

  function renderMemberCard() {
    mName.textContent = currentMember.name;
    mPhone.textContent = currentMember.phone;
    mLevel.textContent = currentMember.level;
    mLevel.className = 'badge level ' + (LEVEL_CLASS[currentMember.level] || 'level-normal');
    mBalance.textContent = fmtMoney(currentMember.balance);
    memberCard.style.display = 'block';
    renderTxList();
  }

  function doSearch() {
    var member = findByPhone(phoneInput.value);
    if (!member) {
      currentMember = null;
      memberCard.style.display = 'none';
      searchMsg.innerHTML = '<div class="msg error">未找到该会员，请确认手机号是否正确。</div>';
      return;
    }
    currentMember = member;
    searchMsg.innerHTML = '';
    renderMemberCard();
  }

  btnSearch.addEventListener('click', doSearch);
  phoneInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doSearch();
  });

  // ---------- Recharge ----------
  btnOpenRecharge.addEventListener('click', function () {
    if (!currentMember) return;
    rechargeSub.textContent = currentMember.name + ' · 当前余额 ' + fmtMoney(currentMember.balance);
    rechargeMsg.innerHTML = '';
    rechargeForm.reset();
    rechargeModalBackdrop.classList.add('show');
  });
  btnCloseRecharge.addEventListener('click', function () { rechargeModalBackdrop.classList.remove('show'); });
  rechargeModalBackdrop.addEventListener('click', function (e) {
    if (e.target === rechargeModalBackdrop) rechargeModalBackdrop.classList.remove('show');
  });

  rechargeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentMember) return;

    var amount = parseFloat(rechargeAmountInput.value);
    var note = rechargeNoteInput.value.trim();

    if (!(amount > 0)) {
      rechargeMsg.innerHTML = '<div class="msg error">请输入大于 0 的充值金额。</div>';
      return;
    }

    currentMember.balance = MemberData.round2(currentMember.balance + amount);
    var tx = {
      id: MemberData.uid('t'),
      memberId: currentMember.id,
      type: 'recharge',
      amount: amount,
      balanceAfter: currentMember.balance,
      note: note,
      createdAt: MemberData.now(),
    };
    data.transactions.push(tx);
    MemberData.save(data);

    rechargeMsg.innerHTML = '<div class="msg success">充值成功，充值 ' + fmtMoney(amount) + '，当前余额 ' + fmtMoney(currentMember.balance) + '。</div>';
    rechargeForm.reset();
    renderMemberCard();
  });

  // ---------- Consume ----------
  btnOpenConsume.addEventListener('click', function () {
    if (!currentMember) return;
    consumeSub.textContent = currentMember.name + ' · 当前余额 ' + fmtMoney(currentMember.balance);
    consumeMsg.innerHTML = '';
    consumeForm.reset();
    // Dynamic max = current balance. Form has novalidate so this NEVER silently
    // blocks submit — our own JS validation below always runs and shows the
    // styled error message when the amount exceeds the balance.
    consumeAmountInput.max = currentMember.balance;
    consumeModalBackdrop.classList.add('show');
  });
  btnCloseConsume.addEventListener('click', function () { consumeModalBackdrop.classList.remove('show'); });
  consumeModalBackdrop.addEventListener('click', function (e) {
    if (e.target === consumeModalBackdrop) consumeModalBackdrop.classList.remove('show');
  });

  consumeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentMember) return;

    var amount = parseFloat(consumeAmountInput.value);
    var note = consumeNoteInput.value.trim();

    if (!(amount > 0)) {
      consumeMsg.innerHTML = '<div class="msg error">请输入大于 0 的消费金额。</div>';
      return;
    }
    if (amount > currentMember.balance) {
      consumeMsg.innerHTML = '<div class="msg error">余额不足：当前余额 ' + fmtMoney(currentMember.balance) + '，无法消费 ' + fmtMoney(amount) + '。</div>';
      return;
    }

    currentMember.balance = MemberData.round2(currentMember.balance - amount);
    var tx = {
      id: MemberData.uid('t'),
      memberId: currentMember.id,
      type: 'consume',
      amount: amount,
      balanceAfter: currentMember.balance,
      note: note,
      createdAt: MemberData.now(),
    };
    data.transactions.push(tx);
    MemberData.save(data);

    consumeMsg.innerHTML = '<div class="msg success">消费成功，扣款 ' + fmtMoney(amount) + '，当前余额 ' + fmtMoney(currentMember.balance) + '。</div>';
    consumeForm.reset();
    renderMemberCard();
  });
})();
