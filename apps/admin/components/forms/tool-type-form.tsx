/**
 * @fileoverview Tool Type Form Component
 * @fileoverview 工具类型表单组件
 *
 * Client-side form for creating and editing tool categories.
 * Supports badge color styling and multi-locale translations.
 * Tool types are used to group and filter AI tools.
 * 用于创建和编辑工具分类的客户端表单。
 * 支持徽章颜色样式和多语言翻译。工具类型用于分组和筛选AI工具。
 *
 * @module components/forms/tool-type-form
 */

'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { createToolType, updateToolType, deleteToolType, type ToolTypeFormData } from '@/lib/actions/tool-types';
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
import { toolTypeSchema } from '@/lib/validations/tool-type';
import {
  DEFAULT_TOOL_TYPE_TRANSLATIONS,
  TOOL_TYPE_TRANSLATIONS_EXAMPLE,
} from '@/lib/locales';

type TranslationData = {
  name: string;
  description?: string;
};

type ToolTypeData = {
  id: string;
  slug: string;
  badgeColor: 'default' | 'secondary' | 'outline';
  order: number;
  isActive: boolean;
  translations: Record<string, TranslationData>;
};

interface ToolTypeFormProps {
  initialData?: ToolTypeData | null;
  mode: 'create' | 'edit';
}

const BADGE_COLORS = [
  { value: 'default', label: 'Default' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
] as const;

type FieldErrors = Record<string, string>;

type FormState = {
  errors: FieldErrors;
  success?: boolean;
};

export function ToolTypeForm({ initialData, mode }: ToolTypeFormProps) {
  // Translations JSON state
  const [translationsJson, setTranslationsJson] = useState<string>(() => {
    if (initialData?.translations && Object.keys(initialData.translations).length > 0) {
      return JSON.stringify(initialData.translations, null, 2);
    }
    return JSON.stringify(DEFAULT_TOOL_TYPE_TRANSLATIONS, null, 2);
  });

  // Form action with useActionState for proper pending state
  const handleFormAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
    // Parse translations JSON
    let translations: ToolTypeFormData['translations'];
    try {
      translations = JSON.parse(translationsJson);
    } catch {
      return { errors: { translations: 'Invalid JSON format. Please check the syntax.' } };
    }

    const rawData = {
      slug: formData.get('slug') as string,
      badgeColor: formData.get('badgeColor') as string,
      order: parseInt(formData.get('order') as string) || 0,
      isActive: formData.get('isActive') === 'on',
      translations,
    };

    const result = toolTypeSchema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      return { errors: fieldErrors };
    }

    const data: ToolTypeFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateToolType(initialData.id, data);
      } else {
        await createToolType(data);
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

  const [formState, formAction, isPending] = useActionState(handleFormAction, { errors: {} });

  // Alias errors from formState for easier access
  const errors = formState.errors;

  // Format JSON with proper indentation
  const [jsonError, setJsonError] = useState<string>('');
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(translationsJson);
      setTranslationsJson(JSON.stringify(parsed, null, 2));
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  async function handleDelete() {
    if (initialData?.id) {
      await deleteToolType(initialData.id);
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
                placeholder="e.g., edit, stylize, generate"
                aria-invalid={!!errors.slug}
              />
              <FieldDescription>URL-friendly identifier (lowercase, hyphens only)</FieldDescription>
              {errors.slug && <FieldError>{errors.slug}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="badgeColor">Badge Color</FieldLabel>
              <Select name="badgeColor" defaultValue={initialData?.badgeColor || 'default'}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select badge color" />
                </SelectTrigger>
                <SelectContent>
                  {BADGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!errors.order}>
              <FieldLabel htmlFor="order">Display Order</FieldLabel>
              <Input
                id="order"
                name="order"
                type="number"
                defaultValue={initialData?.order || 0}
                min={0}
                aria-invalid={!!errors.order}
              />
              {errors.order && <FieldError>{errors.order}</FieldError>}
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
          <div className="flex items-center justify-between">
            <CardTitle>
              Translations (JSON) <span className="text-destructive">*</span>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleFormatJson}>
              Format JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!errors.translations || !!errors['translations.en.name'] || !!jsonError}>
            <Textarea
              value={translationsJson}
              onChange={(e) => {
                setTranslationsJson(e.target.value);
                setJsonError('');
              }}
              placeholder={TOOL_TYPE_TRANSLATIONS_EXAMPLE}
              rows={12}
              className="font-mono text-sm"
              aria-invalid={!!errors.translations || !!errors['translations.en.name'] || !!jsonError}
            />
            <FieldDescription className="mt-2">
              Required: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">name</code> must be provided for all locales (en, zh, ja, pt).
            </FieldDescription>
            {jsonError && <FieldError>{jsonError}</FieldError>}
            {errors.translations && <FieldError>{errors.translations}</FieldError>}
            {(errors['translations.en.name'] || errors['translations.zh.name'] || errors['translations.ja.name'] || errors['translations.pt.name']) && (
              <FieldError>Name is required for all locales</FieldError>
            )}
          </Field>
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
                  <AlertDialogTitle>Delete Tool Type</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this tool type? This action cannot be undone.
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
          <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Tool Type' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
