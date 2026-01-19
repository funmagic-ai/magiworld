/**
 * @fileoverview Admin Provider Form Component
 * @fileoverview 管理员提供商表单组件
 *
 * Client-side form for creating and editing admin provider credentials.
 * Simplified version without rate limiting or circuit breaker fields.
 * 用于创建和编辑管理员提供商凭据的客户端表单。
 * 简化版本，没有速率限制或断路器字段。
 *
 * @module components/forms/admin-provider-form
 */

'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from '@/components/ui/field';
import {
  createAdminProvider,
  updateAdminProvider,
  deleteAdminProvider,
} from '@/lib/actions/admin-providers';
import type { AdminProviderCreateInput, AdminProviderEditInput } from '@/lib/validations/admin-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  adminProviderCreateSchema,
  adminProviderEditSchema,
  adminProviderStatusOptions,
} from '@/lib/validations/admin-provider';

type AdminProviderData = {
  id: string;
  slug: string;
  name: string;
  hasApiKey: boolean;
  baseUrl: string;
  status: 'active' | 'inactive';
  isActive: boolean;
};

interface AdminProviderFormProps {
  initialData?: AdminProviderData | null;
  mode: 'create' | 'edit';
}

type FieldErrors = Record<string, string>;

type FormState = {
  errors: FieldErrors;
  success?: boolean;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
};

export function AdminProviderForm({ initialData, mode }: AdminProviderFormProps) {
  const handleFormAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const rawData = {
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      apiKey: formData.get('apiKey') as string || undefined,
      baseUrl: formData.get('baseUrl') as string || undefined,
      status: formData.get('status') as string,
      isActive: formData.get('isActive') === 'on',
    };

    const schema = mode === 'create' ? adminProviderCreateSchema : adminProviderEditSchema;
    const result = schema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      return { errors: fieldErrors };
    }

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateAdminProvider(initialData.id, result.data as AdminProviderEditInput);
      } else {
        // For create mode, apiKey is required and validated by schema
        await createAdminProvider(result.data as AdminProviderCreateInput);
      }
      return { errors: {}, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('NEXT_REDIRECT')) {
        throw error;
      }
      return { errors: { _form: `Failed to save: ${errorMessage}` } };
    }
  };

  const [formState, formAction, isPending] = useActionState(handleFormAction, {
    errors: {},
  });
  const errors = formState.errors;

  async function handleDelete() {
    if (initialData?.id) {
      await deleteAdminProvider(initialData.id);
    }
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.slug}>
              <FieldLabel htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="slug"
                name="slug"
                defaultValue={initialData?.slug || ''}
                placeholder="e.g., fal_ai, google, openai"
                aria-invalid={!!errors.slug}
              />
              <FieldDescription>
                Must match the provider slug used by Magi tools (e.g., fal_ai, google)
              </FieldDescription>
              {errors.slug && <FieldError>{errors.slug}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name || ''}
                placeholder="e.g., Fal.ai, Google Gemini, OpenAI"
                aria-invalid={!!errors.name}
              />
              <FieldDescription>Display name for the provider</FieldDescription>
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.apiKey}>
              <FieldLabel htmlFor="apiKey">
                API Key {mode === 'create' && <span className="text-destructive">*</span>}
                {mode === 'edit' && initialData?.hasApiKey && (
                  <span className="ml-2 text-xs font-normal text-green-600">(configured)</span>
                )}
              </FieldLabel>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder={mode === 'edit' && initialData?.hasApiKey
                  ? 'Leave empty to keep current key'
                  : 'sk-...'}
                aria-invalid={!!errors.apiKey}
                autoComplete="off"
              />
              <FieldDescription>
                {mode === 'edit' && initialData?.hasApiKey
                  ? 'Enter a new key to replace the existing one, or leave empty to keep current'
                  : 'API key for authenticating with the provider (required)'}
              </FieldDescription>
              {errors.apiKey && <FieldError>{errors.apiKey}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.baseUrl}>
              <FieldLabel htmlFor="baseUrl">Base URL</FieldLabel>
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                defaultValue={initialData?.baseUrl || ''}
                placeholder="https://api.example.com/v1 (optional)"
                aria-invalid={!!errors.baseUrl}
              />
              <FieldDescription>
                Custom API endpoint URL (optional, uses default if not set)
              </FieldDescription>
              {errors.baseUrl && <FieldError>{errors.baseUrl}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select name="status" defaultValue={initialData?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {adminProviderStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[status].color}`}
                      >
                        {STATUS_LABELS[status].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Provider operational status
              </FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="isActive">Active</FieldLabel>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={initialData?.isActive ?? true}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {errors._form && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {errors._form}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="destructive" disabled={isPending} />}
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this admin provider?
                    Admin Magi tools will fail if the required provider is deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Provider' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
