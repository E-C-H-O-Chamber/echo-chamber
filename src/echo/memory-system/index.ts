import type { Logger } from '../../utils/logger';

/**
 * 記憶システム（スケルトン）
 * 将来的に短期/長期のコンテキスト保持や検索を提供する。
 */
export class MemorySystem {
  private readonly _env: Env;
  private readonly _storage: DurableObjectStorage;
  private readonly _store: KVNamespace;
  private readonly _logger: Logger;
  private readonly _echoId: string;

  constructor(options: {
    env: Env;
    storage: DurableObjectStorage;
    store: KVNamespace;
    logger: Logger;
    echoId: string;
  }) {
    this._env = options.env;
    this._storage = options.storage;
    this._store = options.store;
    this._logger = options.logger;
    this._echoId = options.echoId;
  }

  /**
   * メモリへ保存（暫定: 未実装）。
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async store(_key: string, _value: string): Promise<void> {
    throw new Error('MemorySystem.store is not implemented yet');
  }

  /**
   * メモリから取得（暫定: 未実装）。
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async recall(_key: string): Promise<string | null> {
    throw new Error('MemorySystem.recall is not implemented yet');
  }

  /**
   * メモリを削除（暫定: 未実装）。
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async forget(_key: string): Promise<void> {
    throw new Error('MemorySystem.forget is not implemented yet');
  }
}
