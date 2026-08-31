# 三阶魔方 (RubikCube)

一个用于三阶魔方填色与求解的渐进式网页应用 (PWA)，纯客户端运行、数据仅存于本地设备。
使用 React + Vite + TypeScript 构建，求解器按需懒加载（代码分包），部署于 GitHub Pages。

**Language:** [العربية](#العربية) · [中文](#中文) · [English](#english) · [Français](#français) · [Русский](#русский) · [Español](#español)

---

## 中文

一个用于三阶魔方填色与求解的渐进式网页应用 (PWA)，纯客户端运行、数据仅存于本地设备。使用 React + Vite + TypeScript 构建，求解器按需懒加载（代码分包），部署于 GitHub Pages。

**在线地址：** <https://agileaq.github.io/RubikCube/>

## 功能

- 对照手上的实体魔方，为图中三阶魔方的 6 个面 48 个非中心格填色。
- 翻转按钮查看背面三个中心（黄 / 红 / 蓝）。
- 调色板显示每种颜色的剩余可用数量。
- 填满且颜色分布可解时出现「开始复原」；不可解时给出原因说明。
- 复原动画逐步演示，并以标准符号（如 `R`、`U'`、`F2`）提示每一步转动，方便照着转动实体魔方。
- 内置图文教程「三阶魔方教程」（层先法，8 个分节）。

## 开发

```bash
npm install
npm run dev
```

Vite 开发服务器默认在 <http://localhost:5173> 启动。

## 测试

```bash
npm run test        # 单次运行 (vitest run)
npm run test:watch  # 监听模式
```

## 构建

```bash
npm run build
```

产物输出到 `dist/`。应用 `base` 为 `/RubikCube/`。求解器被拆分为独立的 `Solve-*.js` chunk，只有进入复原页时才会加载，填色路径不会引入求解器。

本地预览生产构建：

```bash
npm run preview
```

## 部署

推送到 `main` 分支后，GitHub Actions (`.github/workflows/deploy.yml`) 会自动构建并发布到 GitHub Pages。

首次部署：在 GitHub 仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**，然后推送 `main` 即可。

## 在 iOS 上安装（添加到主屏幕）

1. 用 **Safari** 打开应用地址。
2. 点击底部工具栏的「分享」按钮。
3. 选择「添加到主屏幕」。
4. 从主屏幕以独立 (standalone) 模式启动，获得接近原生 App 的体验。

---

## English

A progressive web app (PWA) for coloring and solving a 3×3 Rubik's Cube — runs entirely client-side, all data stays on your device. Built with React + Vite + TypeScript; the solver is lazy-loaded (code-split); deployed to GitHub Pages.

**Live:** <https://agileaq.github.io/RubikCube/>

### Features

- Color the 48 non-center facelets of the 6 faces to match your physical cube.
- Flip button to view the three back centers (yellow / red / blue).
- Palette shows how many stickers of each color remain.
- When the cube is full and solvable, a **Solve** button appears; if unsolvable, the reason is explained.
- Step-by-step solution animation with standard move notation (`R`, `U'`, `F2`) so you can follow along on your physical cube.
- Built-in illustrated tutorial (beginner / layer-by-layer method, 8 sections).

### Develop

```bash
npm install
npm run dev
```

Vite dev server starts at <http://localhost:5173> by default.

### Test

```bash
npm run test        # single run (vitest run)
npm run test:watch  # watch mode
```

### Build

```bash
npm run build
```

Output goes to `dist/`. The app `base` is `/RubikCube/`. The solver is split into separate `Solve-*.js` chunks that load only when you open the solve page — the coloring flow never pulls in the solver.

Preview the production build locally:

```bash
npm run preview
```

### Deploy

Push to `main`; GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to GitHub Pages automatically.

First-time setup: in the GitHub repo, set **Settings → Pages → Source** to **GitHub Actions**, then push `main`.

### Install on iOS (Add to Home Screen)

1. Open the app URL in **Safari**.
2. Tap the **Share** button in the bottom toolbar.
3. Choose **Add to Home Screen**.
4. Launch from the home screen in standalone mode for a near-native experience.

---

## العربية

<div dir="rtl">

تطبيق ويب تقدمي (PWA) لتلوين مكعب روبيك 3×3 وحلّه — يعمل بالكامل على جهاز المستخدم، وتبقى البيانات محلية. مبني بـ React + Vite + TypeScript، مع تحميل الحلّال بشكل مؤجل (تقسيم الشيفرة)، ومنشور على GitHub Pages.

**الرابط المباشر:** <https://agileaq.github.io/RubikCube/>

### المزايا

- لوّن 48 خانة (غير المراكز) على الأوجه الستة لتحاكي مكعبك الحقيقي.
- زر قلب لرؤية المراكز الثلاثة الخلفية (أصفر / أحمر / أزرق).
- لوحة الألوان تعرض عدد الملصقات المتبقية لكل لون.
- عند اكتمال التلوين وقابلية الحل، يظهر زر «ابدأ الحل»؛ وإذا تعذّر الحل يُبيَّن السبب.
- عرض الحل خطوة بخطوة مع رموز الدوران المعيارية (`R` و`U'` و`F2`) لتتمكن من تطبيقها على مكعبك.
- درس مصوّر مدمج (طريقة الطبقات للمبتدئين، 8 أقسام).

### التطوير

```bash
npm install
npm run dev
```

يبدأ خادم Vite التطويري افتراضياً على <http://localhost:5173>.

### الاختبارات

```bash
npm run test        # تشغيل مرة واحدة (vitest run)
npm run test:watch  # وضع المراقبة
```

### البناء

```bash
npm run build
```

تُحفظ المخرجات في `dist/`. المسار الأساس للتطبيق هو `/RubikCube/`. يُقسَّم الحلّال إلى حزم `Solve-*.js` مستقلة لا تُحمَّل إلا عند فتح صفحة الحل، ومسار التلوين لا يستدعيه إطلاقاً.

معاينة بناء الإنتاج محلياً:

```bash
npm run preview
```

### النشر

عند الدفع إلى الفرع `main`، تقوم GitHub Actions (`.github/workflows/deploy.yml`) تلقائياً بالبناء والنشر إلى GitHub Pages.

أول مرة: في مستودع GitHub اختر **Settings → Pages → Source ← GitHub Actions**، ثم ادفع `main`.

### التثبيت على iOS (إضافة إلى الشاشة الرئيسية)

1. افتح رابط التطبيق في **Safari**.
2. انقر زر «مشاركة» في شريط الأدوات السفلي.
3. اختر «إضافة إلى الشاشة الرئيسية».
4. شغّله من الشاشة الرئيسية بوضع مستقل لتجربة شبه أصلية.

</div>

---

## Français

Une PWA pour colorier et résoudre un Rubik's Cube 3×3 — fonctionne entièrement côté client, les données restent sur votre appareil. Construite avec React + Vite + TypeScript ; le solveur est chargé à la demande (découpage de code) ; déployée sur GitHub Pages.

**En ligne :** <https://agileaq.github.io/RubikCube/>

### Fonctionnalités

- Colorez les 48 facettes non centrales des 6 faces pour reproduire votre cube physique.
- Bouton de retournement pour voir les trois centres arrière (jaune / rouge / bleu).
- La palette affiche le nombre d'autocollants restants pour chaque couleur.
- Quand le cube est complet et résoluble, le bouton **Résoudre** apparaît ; sinon la raison est expliquée.
- Animation de la solution pas à pas avec la notation standard (`R`, `U'`, `F2`) à reproduire sur votre cube.
- Tutoriel illustré intégré (méthode débutant / couche par couche, 8 sections).

### Développement

```bash
npm install
npm run dev
```

Le serveur de dev Vite démarre par défaut sur <http://localhost:5173>.

### Tests

```bash
npm run test        # exécution unique (vitest run)
npm run test:watch  # mode watch
```

### Build

```bash
npm run build
```

Sortie dans `dist/`. La `base` de l'app est `/RubikCube/`. Le solveur est découpé en chunks `Solve-*.js` distincts, chargés uniquement à l'ouverture de la page de résolution — le parcours de coloriage ne charge jamais le solveur.

Prévisualisation locale du build de production :

```bash
npm run preview
```

### Déploiement

Poussez sur `main` ; GitHub Actions (`.github/workflows/deploy.yml`) construit et publie automatiquement sur GitHub Pages.

Première fois : dans le dépôt GitHub, réglez **Settings → Pages → Source** sur **GitHub Actions**, puis poussez `main`.

### Installation sur iOS (Ajouter à l'écran d'accueil)

1. Ouvrez l'URL dans **Safari**.
2. Touchez le bouton **Partager** dans la barre d'outils basse.
3. Choisissez **Ajouter à l'écran d'accueil**.
4. Lancez depuis l'écran d'accueil en mode autonome pour une expérience proche du natif.

---

## Русский

PWA для раскраски и сборки кубика Рубика 3×3 — полностью клиентское приложение, данные остаются на устройстве. Построено на React + Vite + TypeScript; солвер загружается лениво (разделение кода); развёрнуто на GitHub Pages.

**Онлайн:** <https://agileaq.github.io/RubikCube/>

### Возможности

- Раскрасьте 48 нецентральных ячеек шести граней так, как выглядит ваш реальный кубик.
- Кнопка переворота показывает три задних центра (жёлтый / красный / синий).
- Палитра отображает, сколько наклеек каждого цвета осталось.
- Когда кубик заполнен и собираем, появляется кнопка «Собрать»; если сборка невозможна, объясняется причина.
- Пошаговая анимация решения со стандартными обозначениями (`R`, `U'`, `F2`) — удобно повторять на своём кубике.
- Встроенный иллюстрированный туториал (метод для начинающих / послойный, 8 разделов).

### Разработка

```bash
npm install
npm run dev
```

Dev-сервер Vite по умолчанию запускается на <http://localhost:5173>.

### Тесты

```bash
npm run test        # однократный запуск (vitest run)
npm run test:watch  # режим слежения
```

### Сборка

```bash
npm run build
```

Результат в `dist/`. `base` приложения — `/RubikCube/`. Солвер разбит на отдельные чанки `Solve-*.js`, которые загружаются только на странице сборки — путь раскраски солвер не подгружает.

Локальный просмотр production-сборки:

```bash
npm run preview
```

### Развёртывание

Пуш в `main` — GitHub Actions (`.github/workflows/deploy.yml`) автоматически собирает и публикует на GitHub Pages.

Первый раз: в репозитории выберите **Settings → Pages → Source → GitHub Actions**, затем запушьте `main`.

### Установка на iOS («На экран “Домой”»)

1. Откройте адрес приложения в **Safari**.
2. Нажмите **«Поделиться»** в нижней панели.
3. Выберите **«На экран “Домой”»**.
4. Запускайте с главного экрана в автономном режиме — почти как нативное приложение.

---

## Español

Una PWA para colorear y resolver el Cubo de Rubik 3×3 — funciona completamente en el cliente, los datos permanecen en tu dispositivo. Construida con React + Vite + TypeScript; el solver se carga de forma diferida (code splitting); desplegada en GitHub Pages.

**En línea:** <https://agileaq.github.io/RubikCube/>

### Funciones

- Colorea las 48 casillas no centrales de las 6 caras para reproducir tu cubo físico.
- Botón de giro para ver los tres centros traseros (amarillo / rojo / azul).
- La paleta muestra cuántas pegatinas quedan de cada color.
- Cuando el cubo está completo y es resoluble, aparece el botón **Resolver**; si no, se explica el motivo.
- Animación de la solución paso a paso con notación estándar (`R`, `U'`, `F2`) para seguir con tu cubo físico.
- Tutorial ilustrado integrado (método para principiantes / por capas, 8 secciones).

### Desarrollo

```bash
npm install
npm run dev
```

El servidor de desarrollo de Vite arranca por defecto en <http://localhost:5173>.

### Pruebas

```bash
npm run test        # ejecución única (vitest run)
npm run test:watch  # modo watch
```

### Build

```bash
npm run build
```

Salida en `dist/`. La `base` de la app es `/RubikCube/`. El solver se divide en chunks `Solve-*.js` que solo se cargan al abrir la página de resolución; el flujo de coloreado nunca lo carga.

Vista previa local del build de producción:

```bash
npm run preview
```

### Despliegue

Sube a `main`; GitHub Actions (`.github/workflows/deploy.yml`) compila y publica automáticamente en GitHub Pages.

Primera vez: en el repositorio, configura **Settings → Pages → Source** como **GitHub Actions** y sube `main`.

### Instalación en iOS (Añadir a la pantalla de inicio)

1. Abre la URL de la app en **Safari**.
2. Toca el botón **Compartir** de la barra inferior.
3. Elige **Añadir a la pantalla de inicio**.
4. Lánzala desde la pantalla de inicio en modo independiente para una experiencia casi nativa.
