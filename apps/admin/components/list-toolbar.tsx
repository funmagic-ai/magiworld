'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface SortOption {
  value: string;
  label: string;
}

interface ListToolbarProps {
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  filterLabel?: string;
  filterParamName?: string;
  sortOptions?: SortOption[];
  currentSearch?: string;
  currentFilter?: string;
  currentSort?: string;
  showDeleted?: boolean;
}

export function ListToolbar({
  searchPlaceholder = 'Search...',
  filterOptions,
  filterLabel = 'Filter',
  filterParamName = 'filter',
  sortOptions,
  currentSearch = '',
  currentFilter = '',
  currentSort = '',
  showDeleted = false,
}: ListToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    updateParams('search', value);
  };

  const handleFilter = (value: string | null) => {
    updateParams(filterParamName, value === 'all' || !value ? '' : value);
  };

  const handleSort = (value: string | null) => {
    updateParams('sort', value === 'default' || !value ? '' : value);
  };

  const handleShowDeleted = (checked: boolean) => {
    updateParams('showDeleted', checked ? 'true' : '');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/30 rounded-lg border">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder={searchPlaceholder}
          defaultValue={currentSearch}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-background"
        />
      </div>

      {/* Filter */}
      {filterOptions && filterOptions.length > 0 && (
        <Select value={currentFilter || 'all'} onValueChange={handleFilter}>
          <SelectTrigger className="w-[150px] bg-background">
            <SelectValue placeholder={filterLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filterLabel}</SelectItem>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      {sortOptions && sortOptions.length > 0 && (
        <Select value={currentSort || 'default'} onValueChange={handleSort}>
          <SelectTrigger className="w-[150px] bg-background">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Order</SelectItem>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Show Deleted Toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
        <Switch
          checked={showDeleted}
          onCheckedChange={handleShowDeleted}
        />
        <span className="text-muted-foreground whitespace-nowrap">Show deleted</span>
      </label>
    </div>
  );
}
