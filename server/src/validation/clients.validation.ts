import {z} from "zod";

export const currencyEnum = [
  'PH',
  'USD',
  'EUR',
  'CAD',
  'AUD'
] as const 

export const CreateClientSchema = z.object({
    organizationId: z.coerce.number().int().positive(),
    fullName: z.string({error: 'Full name is Required'}).min(1).max(100),
    email: z.email()
            .transform(value => value.toLocaleLowerCase()),

    contactPhone: z.string().optional(),
    contactPerson: z.string().optional(),

    company: z.string().optional(),
    taxId: z.string().optional(),

    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),

    barangay: z.string().optional(),
    province: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
      // Preferences
    currency: z.enum(currencyEnum).default("PH").nullable(),
    notes: z.string().optional(),
})

export const GetSingleClientSchena = z.object({
    clientId: z.coerce.number().int().positive(),
    organizationId: z.coerce.number().int().positive()
})

export const UpdateClientSchema = CreateClientSchema.pick({
  fullName: true,
  email: true,
  contactPerson: true,
  company: true,
  city: true,
  contactPhone: true,
  country: true,
  currency: true,
  notes: true,
  state: true,
  postalCode: true,
  barangay: true,
  province: true,
  region: true,
  taxId: true,
  addressLine1: true,
  addressLine2: true
})
.extend({
  currency: z.enum(currencyEnum).nullable().optional()
})
.partial()

export const DeleteClientSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  organizationId: z.coerce.number().int().positive()
})

export const ClientQuerySchema = z.object({
  search: z.string().optional(),
  currency: z.enum(currencyEnum).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10).default(10),
  sortBy: z.
        enum(['createdAt'])
        .default('createdAt'),
  sortOrder: z.
        enum(['asc', 'desc'])
        .default('desc'),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional()
})

export type CreateClient = z.infer<typeof CreateClientSchema>
export type GetSingleClient = z.infer<typeof GetSingleClientSchena>
export type UpdateClient = z.infer<typeof UpdateClientSchema>
export type DeleteClient = z.infer<typeof DeleteClientSchema>
export type ClientQuery = z.infer<typeof ClientQuerySchema>
