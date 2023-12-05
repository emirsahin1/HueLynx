// electron.vite.config.js
import { resolve } from 'path'
export default {
    main: {
        build:{
            lib:{
                entry: 'src/main.js',
                name: 'main'
            },
        }
      // vite config options
    },
    preload: {
        build:{
            lib:{
                entry: 'src/preload.js',
                name: 'preload'
            },
        }
      // vite config options
    },
    renderer: {
      // vite config options
    }
  }