/**
 * services/pagination.ts
 * 
 * Helper central para lidar com paginação no frontend IMOBZY.
 */

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Hook ou Helper simples para gerenciar estado de paginação
 */
export const createPagination = (total: number, page: number, limit: number): Pagination => {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
};

/**
 * Get range for Supabase .range(from, to)
 */
export const getRange = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
};
