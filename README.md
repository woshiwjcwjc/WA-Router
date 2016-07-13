# WA-Router
前端路由模块, 纯js编写, 目前实现了下面的功能
 * 页面前进、后退、跳转，
 * 状态输出，
 * 页面只加载一次
 * 入口配置

## 版本
1.0.0 

##兼容性
es5编写, 使用了H5的history

##怎么跑
添加 wa-router.js
```
<script src="module/wa-router.js"></script>
```
添加 c.css
```
<link rel="stylesheet" href="c.css"/>
```
启动路由
```
router.setup({root:'/html/router'})
```

基本上现代浏览器都能跑, 不过需要部署在服务, 本地跑不了

##例子 (备忘

