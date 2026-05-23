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
    phoneNumber: z.string({error: 'Phone number is required'}).min(1),
    company: z.string().optional(),
    taxId: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
      // Preferences
    currency: z.enum(currencyEnum).default("PH").nullable(),
    notes: z.string().optional(),
})