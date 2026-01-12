/**
 * Echo インスタンス設定の型定義
 *
 * 複数の Echo インスタンスがそれぞれ固有の Discord Bot トークンやチャンネル設定を持つためのレジストリシステム
 */

/**
 * Echo インスタンス ID
 */
export type EchoInstanceId = 'rin';

/**
 * Echo インスタンスごとの設定
 */
export interface EchoInstanceConfig {
  /** インスタンス ID */
  id: EchoInstanceId;

  /** インスタンス名（表示用） */
  name: string;

  /** Discord Bot トークン（インスタンス固有） */
  discordBotToken: string;

  /** チャットチャンネル ID を取得するための KV キー */
  chatChannelKey: string;

  /** Thinking ログを送信する Discord チャンネル ID を取得するための KV キー */
  thinkingChannelKey: string;
}
