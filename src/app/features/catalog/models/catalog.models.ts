export interface ProductFilterRequest {
  page: number;
  size: number;
  sortField: string;
  sortDirection: string;
  categoryId?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface SortOption {
  label: string;
  value: string; // composite "sortField,sortDirection"
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Más nuevos', value: 'createdAt,desc' },
  { label: 'Precio: menor a mayor', value: 'price,asc' },
  { label: 'Precio: mayor a menor', value: 'price,desc' },
  { label: 'Nombre: A-Z', value: 'name,asc' },
];

export const DEFAULT_FILTERS: ProductFilterRequest = {
  page: 0,
  size: 12,
  sortField: 'createdAt',
  sortDirection: 'desc',
};
