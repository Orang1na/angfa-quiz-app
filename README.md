# ANGFA Product Quiz

アンファーストアの商品画像から正式名称を当てるための静的クイズアプリです。

## 使い方

1. `public/data/angfa-quiz-db.json` を読み込みます。
2. 商品画像を見て正式名称を入力します。
3. 空白や一部記号の差は吸収して判定します。

## ローカル起動

`file://` で直接開くと `fetch` で JSON を読めないので、簡易サーバーで開いてください。

```bash
cd /Users/takuto.yoshida/program/angfa-quiz-app
python3 -m http.server 4173
```

その後 `http://localhost:4173` を開きます。

## デプロイ

GitHub Pages 向けの構成です。ビルドは不要です。

- `.github/workflows/deploy-pages.yml` により、`prod` へ push すると GitHub Pages へ自動デプロイします
- 初回だけ Pages の公開方式を GitHub Actions に切り替える必要があります

## ブランチ運用

- `main`: 作業用、確認用
- `prod`: 公開用
- 公開したいタイミングで `main` の内容を `prod` に反映します

## データ運用

- 今回の規模なら DB は不要です
- `public/data/angfa-quiz-db.json` を更新して再 push すれば反映できます
- 商品画像も同梱したい場合は、`python3 scripts/download_images.py` で `public/assets/products/` に保存できます
- 将来的に管理画面やユーザー別の学習履歴が欲しくなったら、そこで初めて Supabase や Firebase を足すのが自然です
