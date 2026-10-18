import { createRouter, createWebHashHistory } from "vue-router";
import RecentView from "../views/RecentView.vue";
import TrashView from "../views/TrashView.vue";
import TasksView from "../views/TasksView.vue";
import MembersView from "../views/MembersView.vue";
import MediaCenterView from "../views/MediaCenterView.vue";
import StoreView from "../views/StoreView.vue";

// 使用 Hash 路由，静态部署时不需要服务器额外配置页面重写。
export default createRouter({
  history: createWebHashHistory(),
  // 每条路由对应一个独立页面。
  routes: [
    { path: "/", name: "home", redirect: "/media" },
    {
      path: "/stores/:id",
      name: "store",
      component: StoreView,
    },
    { path: "/media", name: "media", component: MediaCenterView },
    { path: "/assets", redirect: "/media" },
    { path: "/images", name: "images", redirect: "/media?type=image" },
    { path: "/videos", name: "videos", redirect: "/media?type=video" },
    { path: "/files", name: "files", redirect: "/media?type=file" },
    { path: "/tasks", name: "tasks", component: TasksView },
    { path: "/recent", name: "recent", component: RecentView },
    { path: "/trash", name: "trash", component: TrashView },
    { path: "/members", name: "members", component: MembersView },
  ],
});
