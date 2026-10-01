# iPhone 界面融合（2026-10-01）

iOS 使用本地 BarWeb 内容作为唯一主界面，SwiftUI 负责系统玻璃底栏、安全区、键盘、原生导入和分享。四个主入口为配方、吧台、口味和日记。单个 WKWebView 在切页时保留，开场动画按网页会话播放；配方详情与跟做在同一页面层级内切换。

## 手机布局

- 按 320、375、390、430 pt 宽度检查中英文页面。根视图遵循 iPhone 顶部与底部安全区。
- 固定顶栏与搜索框，单列紧凑配方卡；材料筛选和排序折叠，完整风味图放在详情。
- 玻璃胶囊底栏滚动时收成四个圆形按钮，点击直接切页；选中态、主题与语言来自统一吧台状态。
- 弹窗与键盘出现时隐藏底栏；表单保存操作位于可视区域内。材料逐项添加，照片入口调用系统文件／照片选择与相机。
- 手机专用 CSS 和页面调整由 `nativeNavigation` 启用，普通浏览器与 Mac 保留现有导航。

## 数据与旧功能

- 使用 `sharedBarStateV1` 作为原生存档，网页编辑即时写回；收藏、日记、自建配方、库存和口味档案共用同一状态。
- 首次升级合并旧配方、收藏、库存和日记。日记日期按本地日历转换；照片压缩为备份可携带的 JPEG，自建配方缩略图保存为详情中的补充照片。
- 旧版日记超过三张的照片保留（迁移兼容上限 256 张／条）；新建日记沿用三张上限。原照片文件和旧 UserDefaults 存档保持原样。
- 迁移回执记录本机来源和已消费的旧配方 ID，防止删除后重新导入；其他 iPhone 的备份仍可与本机旧日记合并。
- 损坏数据、缺失照片或超出既有 3.8M 字符保存预算时报告迁移失败，保留旧存档，并提供旧日记查看入口；不会默默丢弃照片。
- 小红书导入保留原生识别与人工核对流程，保存后接入统一配方库。未成功同步的配方保留在旧库，下次启动重试。该原生导入页仍有中文固定文案。
- 系统分享面板继续使用现有原生桥接；每日配方小组件保留，新增 `dddrunk://recipe/<id>` 跳转。小组件继续采用已有每日配方算法。

## 验证

```sh
npm run verify
xcodebuild -project Cocktail60.xcodeproj -scheme Cocktail60 \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath /tmp/dddrunk-ios-build CODE_SIGNING_ALLOWED=NO build
```

浏览器检查使用现有 Playwright 和 Chromium。可用 `PLAYWRIGHT_PATH` 指向模块、`CHROME_PATH` 指向浏览器可执行文件；启动 `npm start` 后运行 `node scripts/verify-iphone.cjs`。覆盖手机宽度、中英文、主题、筛选、返回位置、日记、自建配方、导入桥接和全部引导步骤。

`python3 scripts/verify-ios-migration.py --app /tmp/dddrunk-ios-build/Build/Products/Debug-iphonesimulator/Cocktail60.app` 会创建独立测试模拟器，注入旧库与八张日记照片，验证实际 Swift → WebKit → UserDefaults 迁移和重启幂等性，并在结束后清理该测试设备。默认运行时为 iOS 27.0，可通过 `--runtime` 指定本机已安装的版本。

真实相机、真实小红书链接读取成功率及真机系统分享仍需设备验收。模拟器和浏览器验证不会替代这些检查。
