import { defineComponents } from "blume";

export default defineComponents({
  mdx: {
    HumationInstall: "./components/HumationInstall.astro",
    // SeedDemo は .astro でサーバ側のハイライトを作り、中で island を呼ぶ。
    // islands/ 置きだとファイル名で自動登録され、この .astro と名前が衝突する。
    SeedDemo: "./components/SeedDemo.astro",
    // 以下は入力が固定なので island ではなく .astro。ビルド時に描き切る。
    ReactSeedExample: "./components/ReactSeedExample.astro",
    ReactSelectionExample: "./components/ReactSelectionExample.astro",
    ColorSlotsReference: "./components/ColorSlotsReference.astro",
    // 中の PickerDemoClient だけが island。選択肢はビルド時に作って渡す。
    PickerGuideExample: "./components/PickerGuideExample.astro",
    AvatarOptionsReference: "./components/AvatarOptionsReference.astro",
    CreateAvatarOptionsReference:
      "./components/CreateAvatarOptionsReference.astro",
    HelpersReference: "./components/HelpersReference.astro",
  },
  islands: {
    // 検索・絞り込み・コピーを持つので島。プレビュー全件を
    // props で渡すと SSR 分と二重になるため、島の中で生成する。
    PartsBrowser: "./components/PartsBrowser.tsx",
  },
  layout: {
    // ロゴ + ブランド名に SDK バージョンのバッジを足すためだけの差し替え。
    // 検索・テーマ切替・モバイルドロワーは Blume の Header のまま使う。
    Logo: "./components/Logo.astro",
  },
});
