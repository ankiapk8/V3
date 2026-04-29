import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { Card, ClearGenerations200, CreateDeckBody, Deck, ExportDeckResponse, GenerateCardsBody, GenerateCardsResponse, Generation, HealthStatus, ListGenerationsParams, UpdateCardBody, UpdateDeckBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all decks
 */
export declare const getListDecksUrl: () => string;
export declare const listDecks: (options?: RequestInit) => Promise<Deck[]>;
export declare const getListDecksQueryKey: () => readonly ["/api/decks"];
export declare const getListDecksQueryOptions: <TData = Awaited<ReturnType<typeof listDecks>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDecks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDecks>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDecksQueryResult = NonNullable<Awaited<ReturnType<typeof listDecks>>>;
export type ListDecksQueryError = ErrorType<unknown>;
/**
 * @summary List all decks
 */
export declare function useListDecks<TData = Awaited<ReturnType<typeof listDecks>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDecks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new deck
 */
export declare const getCreateDeckUrl: () => string;
export declare const createDeck: (createDeckBody: CreateDeckBody, options?: RequestInit) => Promise<Deck>;
export declare const getCreateDeckMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDeck>>, TError, {
        data: BodyType<CreateDeckBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDeck>>, TError, {
    data: BodyType<CreateDeckBody>;
}, TContext>;
export type CreateDeckMutationResult = NonNullable<Awaited<ReturnType<typeof createDeck>>>;
export type CreateDeckMutationBody = BodyType<CreateDeckBody>;
export type CreateDeckMutationError = ErrorType<void>;
/**
 * @summary Create a new deck
 */
export declare const useCreateDeck: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDeck>>, TError, {
        data: BodyType<CreateDeckBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDeck>>, TError, {
    data: BodyType<CreateDeckBody>;
}, TContext>;
/**
 * @summary Get a deck by ID
 */
export declare const getGetDeckUrl: (id: number) => string;
export declare const getDeck: (id: number, options?: RequestInit) => Promise<Deck>;
export declare const getGetDeckQueryKey: (id: number) => readonly [`/api/decks/${number}`];
export declare const getGetDeckQueryOptions: <TData = Awaited<ReturnType<typeof getDeck>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDeck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDeckQueryResult = NonNullable<Awaited<ReturnType<typeof getDeck>>>;
export type GetDeckQueryError = ErrorType<void>;
/**
 * @summary Get a deck by ID
 */
export declare function useGetDeck<TData = Awaited<ReturnType<typeof getDeck>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a deck
 */
export declare const getUpdateDeckUrl: (id: number) => string;
export declare const updateDeck: (id: number, updateDeckBody: UpdateDeckBody, options?: RequestInit) => Promise<Deck>;
export declare const getUpdateDeckMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDeck>>, TError, {
        id: number;
        data: BodyType<UpdateDeckBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDeck>>, TError, {
    id: number;
    data: BodyType<UpdateDeckBody>;
}, TContext>;
export type UpdateDeckMutationResult = NonNullable<Awaited<ReturnType<typeof updateDeck>>>;
export type UpdateDeckMutationBody = BodyType<UpdateDeckBody>;
export type UpdateDeckMutationError = ErrorType<void>;
/**
 * @summary Update a deck
 */
export declare const useUpdateDeck: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDeck>>, TError, {
        id: number;
        data: BodyType<UpdateDeckBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDeck>>, TError, {
    id: number;
    data: BodyType<UpdateDeckBody>;
}, TContext>;
/**
 * @summary Delete a deck
 */
export declare const getDeleteDeckUrl: (id: number) => string;
export declare const deleteDeck: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteDeckMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteDeck>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteDeck>>, TError, {
    id: number;
}, TContext>;
export type DeleteDeckMutationResult = NonNullable<Awaited<ReturnType<typeof deleteDeck>>>;
export type DeleteDeckMutationError = ErrorType<void>;
/**
 * @summary Delete a deck
 */
export declare const useDeleteDeck: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteDeck>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteDeck>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List cards for a deck
 */
export declare const getListDeckCardsUrl: (id: number) => string;
export declare const listDeckCards: (id: number, options?: RequestInit) => Promise<Card[]>;
export declare const getListDeckCardsQueryKey: (id: number) => readonly [`/api/decks/${number}/cards`];
export declare const getListDeckCardsQueryOptions: <TData = Awaited<ReturnType<typeof listDeckCards>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDeckCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDeckCards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDeckCardsQueryResult = NonNullable<Awaited<ReturnType<typeof listDeckCards>>>;
export type ListDeckCardsQueryError = ErrorType<unknown>;
/**
 * @summary List cards for a deck
 */
export declare function useListDeckCards<TData = Awaited<ReturnType<typeof listDeckCards>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDeckCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a card
 */
export declare const getUpdateCardUrl: (id: number) => string;
export declare const updateCard: (id: number, updateCardBody: UpdateCardBody, options?: RequestInit) => Promise<Card>;
export declare const getUpdateCardMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCard>>, TError, {
        id: number;
        data: BodyType<UpdateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCard>>, TError, {
    id: number;
    data: BodyType<UpdateCardBody>;
}, TContext>;
export type UpdateCardMutationResult = NonNullable<Awaited<ReturnType<typeof updateCard>>>;
export type UpdateCardMutationBody = BodyType<UpdateCardBody>;
export type UpdateCardMutationError = ErrorType<void>;
/**
 * @summary Update a card
 */
export declare const useUpdateCard: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCard>>, TError, {
        id: number;
        data: BodyType<UpdateCardBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCard>>, TError, {
    id: number;
    data: BodyType<UpdateCardBody>;
}, TContext>;
/**
 * @summary Delete a card
 */
export declare const getDeleteCardUrl: (id: number) => string;
export declare const deleteCard: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteCardMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCard>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCard>>, TError, {
    id: number;
}, TContext>;
export type DeleteCardMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCard>>>;
export type DeleteCardMutationError = ErrorType<void>;
/**
 * @summary Delete a card
 */
export declare const useDeleteCard: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCard>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCard>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Generate Anki cards from text content
 */
export declare const getGenerateCardsUrl: () => string;
export declare const generateCards: (generateCardsBody: GenerateCardsBody, options?: RequestInit) => Promise<GenerateCardsResponse>;
export declare const getGenerateCardsMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateCards>>, TError, {
        data: BodyType<GenerateCardsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateCards>>, TError, {
    data: BodyType<GenerateCardsBody>;
}, TContext>;
export type GenerateCardsMutationResult = NonNullable<Awaited<ReturnType<typeof generateCards>>>;
export type GenerateCardsMutationBody = BodyType<GenerateCardsBody>;
export type GenerateCardsMutationError = ErrorType<void>;
/**
 * @summary Generate Anki cards from text content
 */
export declare const useGenerateCards: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateCards>>, TError, {
        data: BodyType<GenerateCardsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateCards>>, TError, {
    data: BodyType<GenerateCardsBody>;
}, TContext>;
/**
 * @summary List recent card generation runs
 */
export declare const getListGenerationsUrl: (params?: ListGenerationsParams) => string;
export declare const listGenerations: (params?: ListGenerationsParams, options?: RequestInit) => Promise<Generation[]>;
export declare const getListGenerationsQueryKey: (params?: ListGenerationsParams) => readonly ["/api/generations", ...ListGenerationsParams[]];
export declare const getListGenerationsQueryOptions: <TData = Awaited<ReturnType<typeof listGenerations>>, TError = ErrorType<unknown>>(params?: ListGenerationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGenerationsQueryResult = NonNullable<Awaited<ReturnType<typeof listGenerations>>>;
export type ListGenerationsQueryError = ErrorType<unknown>;
/**
 * @summary List recent card generation runs
 */
export declare function useListGenerations<TData = Awaited<ReturnType<typeof listGenerations>>, TError = ErrorType<unknown>>(params?: ListGenerationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGenerations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Clear all generation history
 */
export declare const getClearGenerationsUrl: () => string;
export declare const clearGenerations: (options?: RequestInit) => Promise<ClearGenerations200>;
export declare const getClearGenerationsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearGenerations>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof clearGenerations>>, TError, void, TContext>;
export type ClearGenerationsMutationResult = NonNullable<Awaited<ReturnType<typeof clearGenerations>>>;
export type ClearGenerationsMutationError = ErrorType<unknown>;
/**
 * @summary Clear all generation history
 */
export declare const useClearGenerations: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearGenerations>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof clearGenerations>>, TError, void, TContext>;
/**
 * @summary Export deck as CSV text for Anki import
 */
export declare const getExportDeckUrl: (id: number) => string;
export declare const exportDeck: (id: number, options?: RequestInit) => Promise<ExportDeckResponse>;
export declare const getExportDeckQueryKey: (id: number) => readonly [`/api/decks/${number}/export`];
export declare const getExportDeckQueryOptions: <TData = Awaited<ReturnType<typeof exportDeck>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportDeck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof exportDeck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ExportDeckQueryResult = NonNullable<Awaited<ReturnType<typeof exportDeck>>>;
export type ExportDeckQueryError = ErrorType<void>;
/**
 * @summary Export deck as CSV text for Anki import
 */
export declare function useExportDeck<TData = Awaited<ReturnType<typeof exportDeck>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportDeck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map