(function (global) {
  'use strict';
  var STORAGE_KEY = 'membercard_lite_data_v1';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function localIso(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function now() { return localIso(new Date()); }

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

  function clampDay(day, year, month) {
    return Math.min(Math.max(day, 1), daysInMonth(year, month));
  }

  // Builds seed data with dates ANCHORED to the current calendar month/day at
  // load time, so "this month" / "last month" transactions stay realistic no
  // matter when the demo is opened (no hardcoded absolute dates).
  function seed() {
    var n = new Date();
    var y = n.getFullYear(), m = n.getMonth(), today = n.getDate();
    var prevY = m === 0 ? y - 1 : y;
    var prevM = m === 0 ? 11 : m - 1;

    function thisMonth(day, h, mi) {
      return localIso(new Date(y, m, clampDay(Math.min(day, today), y, m), h, mi, 0));
    }
    function lastMonth(day, h, mi) {
      return localIso(new Date(prevY, prevM, clampDay(day, prevY, prevM), h, mi, 0));
    }
    function joinedMonthsAgo(nMonths, day) {
      var jy = y, jm = m - nMonths;
      while (jm < 0) { jm += 12; jy -= 1; }
      return localIso(new Date(jy, jm, clampDay(day, jy, jm), 10, 0, 0)).slice(0, 10);
    }

    var members = [
      { id: 'm1', name: '张伟', phone: '13800000001', balance: 680, level: '金卡', joinedDate: joinedMonthsAgo(6, 12) },
      { id: 'm2', name: '李娜', phone: '13800000002', balance: 235, level: '银卡', joinedDate: joinedMonthsAgo(4, 5) },
      { id: 'm3', name: '王芳', phone: '13800000003', balance: 90, level: '普通', joinedDate: joinedMonthsAgo(0, 1) },
      { id: 'm4', name: '陈杰', phone: '13800000004', balance: 1150, level: '金卡', joinedDate: joinedMonthsAgo(8, 20) },
      { id: 'm5', name: '刘敏', phone: '13800000005', balance: 156, level: '银卡', joinedDate: joinedMonthsAgo(5, 9) },
      { id: 'm6', name: '赵强', phone: '13800000006', balance: 50, level: '普通', joinedDate: joinedMonthsAgo(2, 15) },
    ];

    var transactions = [
      // 张伟 m1: last month 500 -> -80, this month +300 -> -40  => ends 680
      { id: 't1', memberId: 'm1', type: 'recharge', amount: 500, balanceAfter: 500, note: '开卡充值', createdAt: lastMonth(5, 10, 20) },
      { id: 't2', memberId: 'm1', type: 'consume', amount: 80, balanceAfter: 420, note: '理发套餐', createdAt: lastMonth(20, 15, 5) },
      { id: 't3', memberId: 'm1', type: 'recharge', amount: 300, balanceAfter: 720, note: '充值活动', createdAt: thisMonth(2, 11, 40) },
      { id: 't4', memberId: 'm1', type: 'consume', amount: 40, balanceAfter: 680, note: '洗剪吹', createdAt: thisMonth(4, 16, 10) },

      // 李娜 m2: last month +300, this month -65 => ends 235
      { id: 't5', memberId: 'm2', type: 'recharge', amount: 300, balanceAfter: 300, note: '开卡充值', createdAt: lastMonth(3, 9, 30) },
      { id: 't6', memberId: 'm2', type: 'consume', amount: 65, balanceAfter: 235, note: '美甲', createdAt: thisMonth(2, 14, 0) },

      // 王芳 m3: this month +100, -10 => ends 90
      { id: 't7', memberId: 'm3', type: 'recharge', amount: 100, balanceAfter: 100, note: '开卡充值', createdAt: thisMonth(1, 10, 0) },
      { id: 't8', memberId: 'm3', type: 'consume', amount: 10, balanceAfter: 90, note: '饮品', createdAt: thisMonth(3, 18, 25) },

      // 陈杰 m4: last month +1000, -150, this month +300 => ends 1150
      { id: 't9', memberId: 'm4', type: 'recharge', amount: 1000, balanceAfter: 1000, note: '开卡充值（大客户）', createdAt: lastMonth(8, 9, 0) },
      { id: 't10', memberId: 'm4', type: 'consume', amount: 150, balanceAfter: 850, note: '精油护理', createdAt: lastMonth(25, 19, 15) },
      { id: 't11', memberId: 'm4', type: 'recharge', amount: 300, balanceAfter: 1150, note: '追加充值', createdAt: thisMonth(5, 13, 0) },

      // 刘敏 m5: last month +200, this month -44 => ends 156
      { id: 't12', memberId: 'm5', type: 'recharge', amount: 200, balanceAfter: 200, note: '开卡充值', createdAt: lastMonth(10, 10, 45) },
      { id: 't13', memberId: 'm5', type: 'consume', amount: 44, balanceAfter: 156, note: '洗护套餐', createdAt: thisMonth(3, 17, 30) },

      // 赵强 m6: this month +50 => ends 50
      { id: 't14', memberId: 'm6', type: 'recharge', amount: 50, balanceAfter: 50, note: '开卡充值', createdAt: thisMonth(1, 12, 0) },
    ];

    return { members: members, transactions: transactions };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var s = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function monthKey(dateStr) {
    return dateStr.slice(0, 7);
  }

  global.MemberData = {
    load: load,
    save: save,
    uid: uid,
    now: now,
    round2: round2,
    monthKey: monthKey,
    reset: function () { var s = seed(); save(s); return s; },
  };
})(window);
