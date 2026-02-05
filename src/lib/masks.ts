export const maskCpfCnpj = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskCPF = (value: string) => {
  const v = value.replace(/\D/g, "");
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1")
    .substring(0, 14);
};

export const maskCNPJ = (value: string) => {
  const v = value.replace(/\D/g, "");
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1")
    .substring(0, 18);
};

export const maskPhone = (value: string) => {
  let v = value.replace(/\D/g, "");
  // (11) 99999-9999 (11 digits) or (11) 9999-9999 (10 digits)
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v.substring(0, 15); // (11) 99999-9999 is 15 chars
};

export const maskZip = (value: string) => {
  const v = value.replace(/\D/g, "");
  return v.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
};

export const maskDate = (value: string) => {
  const v = value.replace(/\D/g, "");
  return v
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
    .substring(0, 10);
};

export const maskNumber = (value: string) => {
  return value.replace(/\D/g, "");
};

// Formats a number as BRL currency (e.g. 1000 -> R$ 1.000,00)
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Formats input string (ATM style) to currency string
// e.g. "100" -> "R$ 1,00"
export const maskCurrency = (value: string) => {
  const v = value.replace(/\D/g, "");
  const numberValue = Number(v) / 100;
  return formatCurrency(numberValue);
};

// Parses a localized currency string back to number
// e.g. "R$ 1.000,00" -> 1000
export const parseCurrency = (value: string) => {
  if (!value) return 0;
  // Remove formatting characters (everything except digits and comma)
  // Assuming pt-BR where comma is decimal separator
  const cleanValue = value.replace(/\./g, "").replace(",", ".");
  const number = Number(cleanValue.replace(/[^0-9.]/g, ""));
  return isNaN(number) ? 0 : number;
};
