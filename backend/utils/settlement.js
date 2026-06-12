/**
 * Calculate net balances for each member of a trip based on expenses.
 *
 * @param {Array} members - array of user objects/ids ({ _id, name, email })
 * @param {Array} expenses - array of expense documents with paidBy, amount, splitAmong
 * @returns {Array} balances - [{ userId, name, email, balance }]
 *   balance > 0  => this user is owed money (should receive)
 *   balance < 0  => this user owes money (should pay)
 */
const calculateBalances = (members, expenses) => {
  // Initialize balance map
  const balanceMap = {};
  members.forEach((member) => {
    const id = member._id ? member._id.toString() : member.toString();
    balanceMap[id] = {
      userId: id,
      name: member.name || '',
      email: member.email || '',
      balance: 0,
    };
  });

  expenses.forEach((expense) => {
    const amount = expense.amount;
    const paidById = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();

    const splitAmong = expense.splitAmong && expense.splitAmong.length > 0
      ? expense.splitAmong
      : members; // fallback: split among all members if not specified

    const splitCount = splitAmong.length;
    const sharePerPerson = amount / splitCount;

    // Credit the payer with the full amount
    if (balanceMap[paidById]) {
      balanceMap[paidById].balance += amount;
    }

    // Debit each person their share
    splitAmong.forEach((person) => {
      const personId = person._id ? person._id.toString() : person.toString();
      if (balanceMap[personId] !== undefined) {
        balanceMap[personId].balance -= sharePerPerson;
      }
    });
  });

  // Round to 2 decimal places to avoid floating point issues
  Object.values(balanceMap).forEach((entry) => {
    entry.balance = Math.round(entry.balance * 100) / 100;
  });

  return Object.values(balanceMap);
};

/**
 * Greedy debt simplification.
 * Repeatedly matches the largest creditor with the largest debtor
 * to produce a minimal list of settlement transactions.
 *
 * @param {Array} balances - [{ userId, name, email, balance }]
 * @returns {Array} transactions - [{ from: { userId, name }, to: { userId, name }, amount }]
 */
const simplifyDebts = (balances) => {
  const EPSILON = 0.01;

  // Work on a copy so we don't mutate the original balances
  const people = balances
    .map((b) => ({ ...b }))
    .filter((b) => Math.abs(b.balance) > EPSILON);

  const transactions = [];

  while (people.length > 0) {
    // Sort: largest creditor (most positive) first, largest debtor (most negative) last
    people.sort((a, b) => b.balance - a.balance);

    const creditor = people[0]; // owed the most
    const debtor = people[people.length - 1]; // owes the most

    if (creditor.balance <= EPSILON || debtor.balance >= -EPSILON) {
      break;
    }

    const amount = Math.min(creditor.balance, -debtor.balance);
    const roundedAmount = Math.round(amount * 100) / 100;

    transactions.push({
      from: { userId: debtor.userId, name: debtor.name, email: debtor.email },
      to: { userId: creditor.userId, name: creditor.name, email: creditor.email },
      amount: roundedAmount,
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    // Remove settled people
    people.forEach((p) => {
      if (Math.abs(p.balance) <= EPSILON) p.balance = 0;
    });

    const remaining = people.filter((p) => Math.abs(p.balance) > EPSILON);
    people.length = 0;
    people.push(...remaining);
  }

  return transactions;
};

module.exports = { calculateBalances, simplifyDebts };
