const parseDueDate = (value) => {
  if (typeof value !== "string" || !value) return undefined;

  if (value.includes("T")) {
    const dueDate = new Date(value);
    return Number.isNaN(dueDate.getTime()) ? undefined : dueDate;
  }

  const dueDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(dueDate.getTime()) ? undefined : dueDate;
};

console.log("2026-06-27T15:00 ->", parseDueDate("2026-06-27T15:00"));
console.log("empty string ->", parseDueDate(""));
console.log("null ->", parseDueDate(null));
console.log("undefined ->", parseDueDate(undefined));
