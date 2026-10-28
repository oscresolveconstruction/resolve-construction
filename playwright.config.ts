import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run start -- --port 3100',url:'http://127.0.0.1:3100/login',reuseExistingServer:false,timeout:120000},
});
