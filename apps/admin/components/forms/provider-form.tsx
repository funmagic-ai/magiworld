/**
 * @fileoverview Provider Form Component
 * @fileoverview 提供商表单组件
 *
 * Client-side form for creating and editing AI provider configurations.
 * Supports rate limiting, timeout, and status management.
 * 用于创建和编辑AI提供商配置的客户端表单。
 * 支持速率限制、超时和状态管理。
 *
 * @module components/forms/provider-form
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
  createProvider,
  updateProvider,
  deleteProvider,
  resetCircuitBreaker,
  type ProviderFormData,
} from '@/lib/actions/providers';
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
import { providerCreateSchema, providerEditSchema, providerStatusOptions } from '@/lib/validations/provider';

type ProviderData = {
  id: string;
  slug: string;
  name: string;
  hasApiKey: boolean;
  baseUrl: string;
  rateLimitMax: number;
  rateLimitWindow: number;
  defaultTimeout: number;
  status: 'active' | 'inactive' | 'degraded';
  circuitState: 'closed' | 'open' | 'half_open';
  circuitOpenedAt: Date | null;
  failureCount: number;
  isActive: boolean;
};

interface ProviderFormProps {
  initialData?: ProviderData | null;
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
  degraded: { label: 'Degraded', color: 'bg-yellow-100 text-yellow-800' },
};

const CIRCUIT_STATE_LABELS: Record<string, { label: string; color: string }> = {
  closed: { label: 'Closed (Normal)', color: 'bg-green-100 text-green-800' },
  open: { label: 'Open (Failing)', color: 'bg-red-100 text-red-800' },
  half_open: { label: 'Half-Open (Testing)', color: 'bg-yellow-100 text-yellow-800' },
};

export function ProviderForm({ initialData, mode }: ProviderFormProps) {
  const handleFormAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const rawData = {
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      apiKey: formData.get('apiKey') as string || undefined,
      baseUrl: formData.get('baseUrl') as string || undefined,
      rateLimitMax: formData.get('rateLimitMax') as string,
      rateLimitWindow: formData.get('rateLimitWindow') as string,
      defaultTimeout: formData.get('defaultTimeout') as string,
      status: formData.get('status') as string,
      isActive: formData.get('isActive') === 'on',
    };

    const schema = mode === 'create' ? providerCreateSchema : providerEditSchema;
    const result = schema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      return { errors: fieldErrors };
    }

    const data: ProviderFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateProvider(initialData.id, data);
      } else {
        await createProvider(data);
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
      await deleteProvider(initialData.id);
    }
  }

  async function handleResetCircuit() {
    if (initialData?.id) {
      await resetCircuitBreaker(initialData.id);
    }
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
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
                URL-friendly identifier (lowercase, underscores). Used for queue routing.
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
              <FieldLabel htmlFor="baseUrl">
                Base URL <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                defaultValue={initialData?.baseUrl || ''}
                placeholder="https://api.example.com/v1"
                aria-invalid={!!errors.baseUrl}
              />
              <FieldDescription>
                API endpoint URL for the provider (e.g., https://api.openai.com/v1)
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
                  {providerStatusOptions.map((status) => (
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
                Provider operational status. Degraded indicates partial issues.
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

      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.rateLimitMax}>
              <FieldLabel htmlFor="rateLimitMax">Max Requests</FieldLabel>
              <Input
                id="rateLimitMax"
                name="rateLimitMax"
                type="number"
                defaultValue={initialData?.rateLimitMax ?? 100}
                min={1}
                max={10000}
                aria-invalid={!!errors.rateLimitMax}
              />
              <FieldDescription>
                Maximum number of requests allowed per rate limit window
              </FieldDescription>
              {errors.rateLimitMax && <FieldError>{errors.rateLimitMax}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.rateLimitWindow}>
              <FieldLabel htmlFor="rateLimitWindow">Window (ms)</FieldLabel>
              <Input
                id="rateLimitWindow"
                name="rateLimitWindow"
                type="number"
                defaultValue={initialData?.rateLimitWindow ?? 60000}
                min={1000}
                max={3600000}
                step={1000}
                aria-invalid={!!errors.rateLimitWindow}
              />
              <FieldDescription>
                Rate limit window in milliseconds (1000 = 1 second, 60000 = 1 minute)
              </FieldDescription>
              {errors.rateLimitWindow && <FieldError>{errors.rateLimitWindow}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.defaultTimeout}>
              <FieldLabel htmlFor="defaultTimeout">Request Timeout (ms)</FieldLabel>
              <Input
                id="defaultTimeout"
                name="defaultTimeout"
                type="number"
                defaultValue={initialData?.defaultTimeout ?? 120000}
                min={1000}
                max={600000}
                step={1000}
                aria-invalid={!!errors.defaultTimeout}
              />
              <FieldDescription>
                Default request timeout in milliseconds (120000 = 2 minutes)
              </FieldDescription>
              {errors.defaultTimeout && <FieldError>{errors.defaultTimeout}</FieldError>}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {mode === 'edit' && initialData && (
        <Card>
          <CardHeader>
            <CardTitle>Circuit Breaker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Current State</div>
                  <div className="text-sm text-muted-foreground">
                    Circuit breaker protects against cascade failures
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    CIRCUIT_STATE_LABELS[initialData.circuitState]?.color || 'bg-gray-100'
                  }`}
                >
                  {CIRCUIT_STATE_LABELS[initialData.circuitState]?.label || initialData.circuitState}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold">{initialData.failureCount}</div>
                  <div className="text-sm text-muted-foreground">Consecutive Failures</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold">
                    {initialData.circuitOpenedAt
                      ? new Date(initialData.circuitOpenedAt).toLocaleTimeString()
                      : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Circuit Opened At</div>
                </div>
              </div>

              {initialData.circuitState !== 'closed' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetCircuit}
                  disabled={isPending}
                >
                  Reset Circuit Breaker
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    Are you sure you want to delete this provider? This action cannot be undone.
                    Tasks using this provider may fail if deleted.
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
