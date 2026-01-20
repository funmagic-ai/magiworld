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
  hasAccessKeyId: boolean;
  hasSecretAccessKey: boolean;
  region: string | null;
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
  values?: {
    slug?: string;
    name?: string;
    baseUrl?: string;
    region?: string;
    rateLimitMax?: string;
    rateLimitWindow?: string;
    defaultTimeout?: string;
    status?: string;
    isActive?: boolean;
  };
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
      accessKeyId: formData.get('accessKeyId') as string || undefined,
      secretAccessKey: formData.get('secretAccessKey') as string || undefined,
      region: formData.get('region') as string || undefined,
      baseUrl: formData.get('baseUrl') as string || undefined,
      rateLimitMax: formData.get('rateLimitMax') as string,
      rateLimitWindow: formData.get('rateLimitWindow') as string,
      defaultTimeout: formData.get('defaultTimeout') as string,
      status: formData.get('status') as string,
      isActive: formData.get('isActive') === 'on',
    };

    // Preserve values for re-render on error
    const preservedValues = {
      slug: rawData.slug,
      name: rawData.name,
      baseUrl: rawData.baseUrl,
      region: rawData.region,
      rateLimitMax: rawData.rateLimitMax,
      rateLimitWindow: rawData.rateLimitWindow,
      defaultTimeout: rawData.defaultTimeout,
      status: rawData.status,
      isActive: rawData.isActive,
    };

    const schema = mode === 'create' ? providerCreateSchema : providerEditSchema;
    const result = schema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      return { errors: fieldErrors, values: preservedValues };
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
      return { errors: { _form: `Failed to save: ${errorMessage}` }, values: preservedValues };
    }
  };

  const [formState, formAction, isPending] = useActionState(handleFormAction, {
    errors: {},
  });
  const errors = formState.errors;
  const values = formState.values;

  // Get value with fallback: preserved value > initial data > default
  const getValue = <T,>(key: keyof NonNullable<typeof values>, fallback: T): T | string => {
    if (values?.[key] !== undefined) return values[key] as string;
    return fallback;
  };

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
                defaultValue={getValue('slug', initialData?.slug || '')}
                placeholder="e.g., fal_ai, google, openai"
                aria-invalid={!!errors.slug}
                key={`slug-${values?.slug ?? 'init'}`}
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
                defaultValue={getValue('name', initialData?.name || '')}
                placeholder="e.g., Fal.ai, Google Gemini, OpenAI"
                aria-invalid={!!errors.name}
                key={`name-${values?.name ?? 'init'}`}
              />
              <FieldDescription>Display name for the provider</FieldDescription>
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            {/* Credentials Section */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="text-sm font-medium text-muted-foreground">
                Credentials (fill in whichever your provider requires)
              </div>

              <Field data-invalid={!!errors.apiKey}>
                <FieldLabel htmlFor="apiKey">
                  API Key
                  {mode === 'edit' && initialData?.hasApiKey && (
                    <span className="ml-2 text-xs font-normal text-green-600">(configured)</span>
                  )}
                </FieldLabel>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder={mode === 'edit' && initialData?.hasApiKey
                    ? 'Leave empty to keep current'
                    : 'sk-...'}
                  aria-invalid={!!errors.apiKey}
                  autoComplete="off"
                />
                <FieldDescription>
                  For providers using API key authentication
                </FieldDescription>
                {errors.apiKey && <FieldError>{errors.apiKey}</FieldError>}
              </Field>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or IAM credentials</span>
                </div>
              </div>

              <Field data-invalid={!!errors.accessKeyId}>
                <FieldLabel htmlFor="accessKeyId">
                  Access Key ID
                  {mode === 'edit' && initialData?.hasAccessKeyId && (
                    <span className="ml-2 text-xs font-normal text-green-600">(configured)</span>
                  )}
                </FieldLabel>
                <Input
                  id="accessKeyId"
                  name="accessKeyId"
                  type="text"
                  placeholder={mode === 'edit' && initialData?.hasAccessKeyId
                    ? 'Leave empty to keep current'
                    : 'Access key ID...'}
                  aria-invalid={!!errors.accessKeyId}
                  autoComplete="off"
                />
                <FieldDescription>
                  For providers using IAM-style authentication
                </FieldDescription>
                {errors.accessKeyId && <FieldError>{errors.accessKeyId}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.secretAccessKey}>
                <FieldLabel htmlFor="secretAccessKey">
                  Secret Access Key
                  {mode === 'edit' && initialData?.hasSecretAccessKey && (
                    <span className="ml-2 text-xs font-normal text-green-600">(configured)</span>
                  )}
                </FieldLabel>
                <Input
                  id="secretAccessKey"
                  name="secretAccessKey"
                  type="password"
                  placeholder={mode === 'edit' && initialData?.hasSecretAccessKey
                    ? 'Leave empty to keep current'
                    : 'Secret access key...'}
                  aria-invalid={!!errors.secretAccessKey}
                  autoComplete="off"
                />
                <FieldDescription>
                  Paired with Access Key ID
                </FieldDescription>
                {errors.secretAccessKey && <FieldError>{errors.secretAccessKey}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.region}>
                <FieldLabel htmlFor="region">Region</FieldLabel>
                <Input
                  id="region"
                  name="region"
                  type="text"
                  defaultValue={getValue('region', initialData?.region || '')}
                  placeholder="Optional region..."
                  aria-invalid={!!errors.region}
                  key={`region-${values?.region ?? 'init'}`}
                />
                <FieldDescription>
                  Region if required by the provider
                </FieldDescription>
                {errors.region && <FieldError>{errors.region}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.baseUrl}>
              <FieldLabel htmlFor="baseUrl">Base URL</FieldLabel>
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                defaultValue={getValue('baseUrl', initialData?.baseUrl || '')}
                placeholder="https://api.example.com/v1"
                aria-invalid={!!errors.baseUrl}
                key={`baseUrl-${values?.baseUrl ?? 'init'}`}
              />
              <FieldDescription>
                API endpoint URL if required by the provider
              </FieldDescription>
              {errors.baseUrl && <FieldError>{errors.baseUrl}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select name="status" defaultValue={getValue('status', initialData?.status || 'active') as string} key={`status-${values?.status ?? 'init'}`}>
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
                defaultChecked={values?.isActive !== undefined ? values.isActive : (initialData?.isActive ?? true)}
                key={`isActive-${values?.isActive ?? 'init'}`}
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
                defaultValue={getValue('rateLimitMax', String(initialData?.rateLimitMax ?? 100))}
                min={1}
                max={10000}
                aria-invalid={!!errors.rateLimitMax}
                key={`rateLimitMax-${values?.rateLimitMax ?? 'init'}`}
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
                defaultValue={getValue('rateLimitWindow', String(initialData?.rateLimitWindow ?? 60000))}
                min={1000}
                max={3600000}
                step={1000}
                aria-invalid={!!errors.rateLimitWindow}
                key={`rateLimitWindow-${values?.rateLimitWindow ?? 'init'}`}
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
                defaultValue={getValue('defaultTimeout', String(initialData?.defaultTimeout ?? 120000))}
                min={1000}
                max={600000}
                step={1000}
                aria-invalid={!!errors.defaultTimeout}
                key={`defaultTimeout-${values?.defaultTimeout ?? 'init'}`}
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
