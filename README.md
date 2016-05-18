# Lively4 Kernel Loader

The Lively4 Kernel Loader is a small bootloader for the Lively4 environment. It polyfills a minimal ES6 System Loader, allows to transpile ES6+ into runnable code and prepares the environment. This includes testing for ServiceWorker availability and initializes the Lively4 ServiceWorker or loading a fallback environment when loaded cross domain e.g. by the Livel4 Chrome Plugin.
