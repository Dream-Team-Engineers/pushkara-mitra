# Changelog

## [1.13.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.12.0...v1.13.0) (2026-11-20)


### Features

* **account:** Google sign-in scaffold (off), remove OTP and pass creation, header sign-in link; record decision ([fe3ad9f](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/fe3ad9f1fa4e78dc7cb301345c1a81c910f1de04))
* **auth:** Google sign-in on staging: Worker token verification, Me tab and header, staging-only flag ([8b10d49](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/8b10d49c7b7ef5c00889f0c85204003c5e71faf1))
* **auth:** stay signed in via signed cookie (when secret set), delete-account and privacy screens, records ([f7666c3](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/f7666c397344777e9a4c31d1580cd23523a2a1e6))
* **brand:** Home emblem logo and goddess app icon from owner files; sources moved out of dist ([55bf9a5](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/55bf9a56676086b88e4d25b42ea3ba3ff7cfd8e7))
* **brand:** lotus-and-river app icon and header mark from owner file; drop deity icon ([4cb1316](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/4cb1316a4887a6020bf77d796bce0f1b39e8c2cd))
* **brand:** temporary lotus logo and app icons from owner artwork; record provenance ([e7df75b](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e7df75b59fb832d8f203f0e6834777ad36337d52))
* **content:** live news, source links for travel/stay/culture, OSM map links ([87aeadd](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/87aeadda501a33b46dac88970e51752946c9d950))
* **content:** publish owner-approved ghats and confirm event dates ([3ea871b](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/3ea871b00b42409b9b511b211d4fe68179df155f))
* **ghats:** corrected Telugu spellings, Hindi names, 15 more ghats marked unverified ([aaea9b5](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/aaea9b56e469ec48d46bd002da9f6692ffa3c672))
* **ghats:** Telugu names for the 15 approved ghats, shown first in Telugu mode ([e297725](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e2977253d2129b27ecbd0f6e2c79269005512b56))
* **help:** helpline rows with call confirmation, draft 112/1098 sources, record Telugu review ([e2323ac](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e2323acc40ceaf96e86ea824a5a62255f70804b7))
* **helplines:** add owner-supplied police, ambulance, tourist and women numbers (unverified) ([d02551c](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d02551ca3c6e8a9a9a948d7e4bb19d8a6a3964b1))
* **helplines:** approve helplines dataset at 92a74c4 (owner), update tests and status ([4f694a1](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/4f694a11bf40e470a7fab82f9a542a2c1586aae0))
* **helplines:** approve helplines dataset at d02551c, update tests ([43ab008](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/43ab008f456eabb76705167b0d44c13264e8cf7c))
* **helplines:** full owner-supplied helpline list with new kinds (unverified, draft until approved) ([92a74c4](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/92a74c458382b131c8492c3a4c157a6a4e8a63ad))
* **i18n:** dual-language display (Telugu or Hindi plus English), phase 1 ([d572093](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d5720939a43722fe2efd37429e9f7f4dfd882a5d))
* **i18n:** dual-language headings, labels, buttons and chips on all screens (phase 2) ([70f9f2d](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/70f9f2d345393443869757c29e1c8340d6c3067a))
* **map:** real map for the Godavari region and device position (staging) ([fc9a4de](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/fc9a4de6946f1d3859092fb4afe6c6acc01c7ea8))
* **news:** read publishers' own RSS feeds (Siasat, Telangana Today, The Hindu) ([233ec53](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/233ec536e1368c62c0ffcd94e00c2868276f6779))
* **pwa:** install-the-app banner for browser visitors (Android prompt, iPhone how-to) ([6cefe54](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/6cefe5461ce0759cd133a6931f583ec95a4978bf))
* **ui:** compact home, help and ghats layout; seconds in the countdown ([74402f3](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/74402f3c47ef6f2c33b362524922807e1814dd00))
* **ui:** full logo on Home, dot-ring countdown, stacked Help tiles, smaller quick icons ([807e8f0](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/807e8f0f63391bcd506363a9115098d503f74b7a))
* **ui:** Godavari Glass design, labelled language button with sheet ([a64bf5d](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/a64bf5d8ea58c954854c9226c6338cada2b1ca91))
* **ui:** show the build id on the Me tab to spot stale copies ([99f3bc9](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/99f3bc9a248fecee1ea5631e5fa15356a83369ee))


### Bug Fixes

* **auth:** allow inline style attributes for Google's sign-in button (staging only) ([5d81530](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5d81530cf57972f643a6d51b264d95d29b47d563))
* **auth:** allow inline styles for Google's sign-in button (staging only, scripts stay strict) ([987c017](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/987c017188b0104d5be1bd51ed0c8a8a73cb6d92))
* **ci:** build staging in staging mode so pushes keep the Google client ID ([5f18dfc](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5f18dfc63accd1be5d46c84333bda50ce9a91a00))
* **ci:** fix routing test CSP drift, gate staging deploy on full CI, fix bundle measurement ([117c79f](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/117c79ff3a60501b2ea8ae765103a1d87fee0aae))
* **ci:** ignore expected /api/public 404 and offline errors in the smoke test ([45014f5](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/45014f5a209978713b945b58fdbced161d24bbc7))
* **ci:** ignore expected /api/public 404 and offline errors in the smoke test ([#129](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/129)) ([d0b44ad](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d0b44ad95bd3fd281580aae6689f5c6a2df5b929))
* **fonts:** ship full Telugu and Devanagari character sets; fix Windows script bugs ([399d7ef](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/399d7ef55a7a23430e30697db3c432f5abf0b316))
* **map:** smoke-test server serves byte ranges and module workers; cache map code on first use ([e390cef](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e390cef27ac6775b17f691aeb6c684bc26758f2d))
* **news:** never truncate article links (Google links exceed 500 chars) ([6017932](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/6017932891185c91fd2000f2b11d03147700f89b))
* **pwa:** apply a found update automatically right after the page opens ([5af22e7](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5af22e734a16118537efb42922cb8d510f33c9e6))
* **security:** replace high-entropy test fixture and allowlist its history fingerprint ([1f3c1ce](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/1f3c1ce1a44196a69c67bbffbe3d786d873349ab))
* **ui:** phone-width app column and desktop-site-mode zoom compensation ([371bcba](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/371bcba3d3d7ce2125de61cc74ac856da557941c))
* **ui:** stop the desktop-mode zoom from inflating page height (blank space below content) ([607718f](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/607718f4d0dc23b4d1dc13c67d523072ee80553c))

## [1.12.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.11.0...v1.12.0) (2026-11-14)


### Features

* **content:** owner-approved public listings API and launch guide ([5740f16](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5740f16f0db4c70d99fc68c305397fa9e03359a1))
* **ghats:** draft 15 official East Godavari ghats for owner approval ([8dd68a5](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/8dd68a5b04fee60d6904219692bd992c9cd8aecb))

## [1.11.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.10.0...v1.11.0) (2026-11-14)


### Features

* **deploy:** add explicit staging and production scripts ([#125](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/125)) ([56a386a](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/56a386a1247634207027d50fe4a45b389af83699))

## [1.10.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.9.1...v1.10.0) (2026-11-14)


### Features

* **security:** add disabled fail-closed Access key source with tests ([#119](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/119)) ([fc47bef](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/fc47beff4b596c8cf2d426129cf2f4135c99fa18))


### Bug Fixes

* **ci:** make PR checklist independent of merge-time checks ([#124](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/124)) ([0fd3b57](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/0fd3b577bf873a7856afe81d1ca90962b400396b))
* **ci:** retry headless Chrome start in the browser smoke test ([#118](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/118)) ([a467fc7](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/a467fc7093dd24ebbc3e8b2f2bc4947aa4f8f08c))

## [1.9.1](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.9.0...v1.9.1) (2026-11-14)


### Bug Fixes

* allow sole owner preview bootstrap ([#116](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/116)) ([42819af](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/42819af30ac26bceb505c13faa4938b7d68cfc12))
* **governance:** require complete PR checklist and record public visibility ([dc4e3db](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/dc4e3db69f19c0bd6d191b9589ae5a3f2fc14d1d))
* **governance:** require complete PR checklist and record public visibility ([4b662da](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/4b662da0b24fb181f7188a4dc1fa3818134ec0a4))
* **governance:** support sole maintainer with required checks ([#114](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/114)) ([6ae35e7](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/6ae35e77b46cea04a6368eab6bf28c19f7a2a7a8))
* make release tag rule compatible with Actions ([#115](https://github.com/Dream-Team-Engineers/pushkara-mitra/issues/115)) ([5351e5d](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5351e5d7e74ae84f74201fd152ae025b66548ddd))

## [1.9.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.8.0...v1.9.0) (2026-11-13)


### Features

* **security:** add disabled Cloudflare Access token verifier with tests ([09ed717](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/09ed7170116acd4a4de3785a4ef3fd11c26bcad7))
* **security:** add disabled Cloudflare Access token verifier with tests ([79773ec](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/79773ec840f106a38fbdf420449ee868147e72d3))


### Bug Fixes

* **security:** satisfy typecheck and lint for the Access verifier ([4d19590](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/4d195902c1d2f53e5beaa252f44f2d43c7730f12))

## [1.8.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.7.0...v1.8.0) (2026-11-11)


### Features

* **api:** add GET /api/public/information that serves only approved copy, gated off in the app ([787aff9](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/787aff98dc315bc3b047095f8e9d262b3027e46c))
* **api:** add public information endpoint that serves only approved copy ([f0ac908](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/f0ac908ca45c7881e54ef64bc4f34268e8fd060e))


### Bug Fixes

* **test:** accept either entity form for escaped markup ([65e114e](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/65e114e19cf0c6050d020f52593338b2791a2150))
* **test:** force online state in component tests; satisfy lint rules ([e3b50ba](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e3b50bad641e4c1103f3ff0f4f5af7c9894e2a82))

## [1.7.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.6.0...v1.7.0) (2026-11-10)


### Features

* **web:** serve the new frontend build (dist/web) from the Worker ([bb2e759](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/bb2e759d7149f2edf0374efc17878a2b9e20329b))
* **web:** serve the new frontend build from the Worker (cut-over) ([bc27849](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/bc27849fbafebad1709afde58e64c0f064074793))


### Bug Fixes

* **ci:** drop redundant eslint global and correct the Hindi font smoke check ([30d3632](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/30d36327d190cdc4257358ad3774963c487cff18))
* **ci:** drop redundant fetch global; check Hindi fonts on the Home screen only ([f29af8e](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/f29af8e689681abc7a332adb2b40cb7b69d38863))
* **ci:** use globalThis.fetch in the smoke test ([fe33892](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/fe33892c26a1a550694ae43edd18e904b076c7a6))
* **ci:** use globalThis.fetch in the smoke test ([6ccbb9d](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/6ccbb9d5d1b31ebff60df3fe61fb93fd6b5532fa))

## [1.6.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.5.0...v1.6.0) (2026-11-10)


### Features

* **web:** add inert prototypes, self-hosted fonts, service worker and browser smoke test ([3c32ec2](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/3c32ec29aac50c6c6198c5a83ea13c0769eb46d9))
* **web:** add Pilgrim Pass, My Group, Maps, Emergency and Partners as inert prototypes ([d2c17d9](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d2c17d9e2a2c429abcc1ad0734b2a2b71311316f))
* **web:** list bundled fonts and software with their licences in Settings ([395a01a](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/395a01aff757fde2ef066b87bf6345dfcc945b46))
* **web:** self-hosted fonts, build-generated service worker, manifest and update prompt ([781646c](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/781646c3168438adfbafb22351b5c01d2b7e47bc))


### Bug Fixes

* **web:** latest language request wins; failed catalogue load cannot blank the app ([d50fc22](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d50fc228f4a9c96582b40ada0c6f491df9bce0d5))
* **web:** register the worker after a late boot; reload only after the person accepts an update ([57307dc](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/57307dcf8267946a4f0f339054e3c541b11ae39e))
* **web:** satisfy lint and typecheck for the service worker build and test ([9c2ce2b](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/9c2ce2be3208c4628d5e95cd94d47074956f6562))

## [1.5.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.4.0...v1.5.0) (2026-11-10)


### Features

* **web:** add Ghats, Stay, Travel, Culture/News and Conditions screens ([5ec700f](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5ec700f15654503e5c2ace006473e1d308b3775b))

## [1.4.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.3.0...v1.4.0) (2026-11-10)


### Features

* **web:** add Preact + Vite scaffold, hash router, shared UI and Home screen ([ebd76e8](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/ebd76e8da48243c7ba9f2af6cdc12ae7983890d1))
* **web:** add Preact + Vite scaffold, router, shared UI and Home ([bb5cd09](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/bb5cd09ec610b0539d52126551322bb4005fe5ba))


### Bug Fixes

* **deps:** include preact-iso required peer ([5c37602](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5c3760258db6ff7a93cc7bf10bb265043df3ebac))
* **web:** flag forms without an action attribute in the privacy guard ([5497822](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/5497822e62f23be98d140d28bf1c74dbd1562e81))
* **web:** flag forms without an action attribute in the privacy guard ([81aba7a](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/81aba7ad7d0ee353eca9c38dbe91f90bfcf99a18))
* **web:** type EVENT.datesConfirmed as boolean so the pending-dates branch lints ([928d6d4](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/928d6d48789853ae30edd50ccd6fa6ad527443df))

## [1.3.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.2.0...v1.3.0) (2026-11-10)


### Features

* **web:** add te/en/hi message catalogues and parity guard ([2b30b20](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/2b30b202e32a17c496cb77ffed54a51172fdef96))

## [1.2.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.1.0...v1.2.0) (2026-11-10)


### Features

* **frontend:** add design tokens with light, dark and outdoor themes ([63c0130](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/63c01304e3c1199ca5392fd40174b9b8cae7e7a6))
* **frontend:** add design tokens with light, dark and outdoor themes ([0774824](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/07748245715412e51d4ffdc4d8860d319da210ce))

## [1.1.0](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.6...v1.1.0) (2026-11-07)


### Features

* integrate mobile review UI onto main ([e953ae4](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e953ae437cb5fa6a91f7c04851fdc3d1cb465f4a))

## [1.0.6](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.5...v1.0.6) (2026-11-07)


### Bug Fixes

* verify independent reviews and prepare foundation adoption ([ddad42a](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/ddad42a09524aa12b51bc9e912e6f35e49f38006))
* verify independent reviews and prepare foundation adoption ([0a32daf](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/0a32dafbf3af90fe9eb6b2780090ce869aee5eb7))

## [1.0.5](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.4...v1.0.5) (2026-11-05)


### Bug Fixes

* override minimatch and glob to patched versions ([8633605](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/8633605b1e3c2464c286806b9cfbc9b43a5b99e8))
* override minimatch and glob to patched versions; track open decisions ([ab2722e](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/ab2722e3e67517e2b4456e36438664f84f94b9b7))

## [1.0.4](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.3...v1.0.4) (2026-11-05)


### Bug Fixes

* enforce Worker security policy on static assets ([d3c17ee](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d3c17ee3c35f5e3be4cd2270c574a7f8236bc040))
* fail closed on invalid dependency scan evidence ([f801ae6](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/f801ae6f8b4d550a58a2fdee81ed116537c985a0))
* verify GitHub protections before reporting success ([d39a85b](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/d39a85b3b634d9548d3bb2cdf2626fad2c39b1a9))

## [1.0.3](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.2...v1.0.3) (2026-11-05)


### Bug Fixes

* pause unreviewed preview credential execution ([64a4477](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/64a447789484764b55a38bb98c1b04ed486d18ba))

## [1.0.2](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.1...v1.0.2) (2026-11-04)


### Bug Fixes

* prepare reviewed one-time Free preview bootstrap ([6ae4ba0](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/6ae4ba05ece4138bc5c74045273340a3739b298e))
* prepare reviewed one-time Free preview bootstrap ([33695b0](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/33695b06043d2caf7f99d600123529bbd88709cf))

## [1.0.1](https://github.com/Dream-Team-Engineers/pushkara-mitra/compare/v1.0.0...v1.0.1) (2026-11-04)


### Bug Fixes

* block automatic production deployment ([ab97849](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/ab9784998a35f5ee3173d497e9dbed2249c3a25b))
* block automatic production deployment ([c289852](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/c289852a3d4cf8500c158daef12fad2bd87481f0))

## 1.0.0 (2026-11-03)


### Bug Fixes

* **ci:** handle platform binaries in licence check and empty prod lockfile in sca ([34d2ab0](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/34d2ab03fb2ca5645a5e0bf23a26311469fd1bd3))
* **ci:** handle platform binaries in licence check and empty prod lockfile in sca ([297f2b9](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/297f2b9f8625e05178e3880ce67ce9f72f5741b6))
* **deps:** upgrade vitest toolchain to 5.x together ([401b524](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/401b5248bb06b99a7fd6930a39eff1632301e660))
* **deps:** upgrade vitest toolchain to 5.x together ([c7f358c](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/c7f358c619427d0057f00b36bd1f368a2fb12a38))
* **staging:** use SQLite-backed Durable Object class on Workers Free ([2bca941](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/2bca94161311715ecf7d6a8c9b322d2e40339de8))
* **staging:** use SQLite-backed Durable Object class on Workers Free ([e555481](https://github.com/Dream-Team-Engineers/pushkara-mitra/commit/e5554816dd6ba88c9d9608a5726b675c8a97b7cf))

## Changelog

All notable changes are recorded here by release-please. Do not edit by hand.
