import axios from "axios";

import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

type WhatsAppInvoicePayload = {
  transactionId: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  customerPhone: string | null;
};

type FonnteSendResponse = {
  status: boolean;
  detail?: string;
  id?: string[];
  process?: string;
  requestid?: number;
  target?: string[];
};

const FONNTE_SEND_MESSAGE_URL = "https://api.fonnte.com/send";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const normalizePhoneNumber = (value: string): string => {
  const digitsOnly = value.replace(/[^\d]/g, "");

  if (digitsOnly.length < 9) {
    throw new ApiError(400, "WhatsApp phone number must contain at least 9 digits.");
  }

  if (digitsOnly.startsWith("62")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `62${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("8")) {
    return `62${digitsOnly}`;
  }

  return digitsOnly;
};

const resolveTargetPhoneNumber = (customerPhone: string | null): string => {
  if (customerPhone) {
    return normalizePhoneNumber(customerPhone);
  }

  if (env.FONNTE_DEFAULT_TARGET) {
    return normalizePhoneNumber(env.FONNTE_DEFAULT_TARGET);
  }

  throw new ApiError(
    500,
    "WhatsApp target number is not configured. Set customerPhone or FONNTE_DEFAULT_TARGET."
  );
};

const buildInvoiceMessage = (payload: WhatsAppInvoicePayload): string => {
  const paymentMethod = payload.paymentMethod ?? "-";

  return [
    "Invoice Pembayaran POS",
    "",
    `Transaction ID: ${payload.transactionId}`,
    `Total Pembayaran: ${formatCurrency(payload.totalAmount)}`,
    `Status Pembayaran: ${payload.paymentStatus}`,
    `Metode Pembayaran: ${paymentMethod}`,
    "",
    "Pembayaran berhasil diproses. Terima kasih.",
  ].join("\n");
};

export const sendPaymentInvoiceWhatsApp = async (
  payload: WhatsAppInvoicePayload
): Promise<FonnteSendResponse> => {
  const target = resolveTargetPhoneNumber(payload.customerPhone);
  const message = buildInvoiceMessage(payload);
  const formData = new URLSearchParams();

  formData.set("target", target);
  formData.set("message", message);
  formData.set("countryCode", "0");
  formData.set("preview", "false");

  const response = await axios.post<FonnteSendResponse>(
    FONNTE_SEND_MESSAGE_URL,
    formData.toString(),
    {
      headers: {
        Authorization: env.FONNTE_TOKEN,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!response.data.status) {
    throw new ApiError(
      502,
      response.data.detail ?? "Failed to send WhatsApp message via Fonnte."
    );
  }

  return response.data;
};
