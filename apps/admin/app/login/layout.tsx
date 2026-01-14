/**
 * @fileoverview Login Layout
 * @fileoverview 登录布局
 *
 * Minimal layout for login page without sidebar.
 * Passes children through without additional wrapper.
 * 登录页面的最小布局，不包含侧边栏。
 * 直接传递子组件，不添加额外包装。
 *
 * @module app/login/layout
 */

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
