import z from "zod";
import { GetSingleInvoiceSchema } from "./invoices.validation.js";

export const ExportInvoiceSchema = GetSingleInvoiceSchema

export type ExportInvoice = z.infer<typeof ExportInvoiceSchema>