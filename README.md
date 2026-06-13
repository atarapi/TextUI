# TextUI

面白いテキストフィールドの実験集。トップページのカードから、それぞれの入力体験を開けます。

## 起動方法

```bash
python3 -m http.server 8080
```

http://localhost:8080 にアクセス。

## GitHub Pages で公開する

1. GitHub にログイン（初回のみ）

```bash
gh auth login
```

2. リポジトリを作成して push

```bash
cd /Users/s26739/Documents/TextUI
gh repo create TextUI --public --source=. --remote=origin --push
```

リポジトリ名を変えたい場合は `TextUI` の部分を変更してください。

3. GitHub Pages を有効化

```bash
gh api repos/$(gh api user -q .login)/TextUI/pages -X POST \
  -f build_type=legacy \
  -f 'source[branch]=main' \
  -f 'source[path]=/'
```

4. 公開 URL（数分後に有効）

```
https://<あなたのGitHubユーザー名>.github.io/TextUI/
```

例: `https://octocat.github.io/TextUI/`

## フィールド一覧

| カード | 説明 |
|--------|------|
| **Runaway Field** | 打った文字に足が生えて逃げ回る |
| **Stroke Field** | 区画の多い文字は傾きながら沈み、少ない文字はふわふわと浮く |

## 新しいフィールドの追加

`js/gallery.js` の `FIELDS` 配列にエントリを追加し、`fields/` に HTML を置くだけです。
