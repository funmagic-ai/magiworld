/**
 * @fileoverview App Sidebar Component
 * @fileoverview 应用侧边栏组件
 *
 * Main navigation sidebar with collapsible menu groups.
 * Supports icon-only mode and highlights active routes.
 * 带可折叠菜单组的主导航侧边栏。
 * 支持仅图标模式并高亮当前路由。
 *
 * @module components/app-sidebar
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Image01Icon,
  Wrench01Icon,
  ArrowDown01Icon,
  Building03Icon,
  Settings02Icon,
  IdeaIcon,
} from '@hugeicons/core-free-icons';
import { UserButton } from '@/components/auth/user-button';
import { signOut } from '@/lib/auth-actions';

/**
 * Menu item type definition
 * 菜单项类型定义
 */
type MenuItem = {
  title: string;
  url?: string;
  icon: typeof Home01Icon;
  children?: { title: string; url: string }[];
};

/**
 * Navigation menu items configuration
 * 导航菜单项配置
 */
const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home01Icon,
  },
  {
    title: 'Tools',
    icon: Wrench01Icon,
    children: [
      { title: 'Tools', url: '/tools' },
      { title: 'Tool Types', url: '/tool-types' },
    ],
  },
  {
    title: 'Content',
    icon: Image01Icon,
    children: [
      { title: 'Banners', url: '/banners' },
      { title: 'Library', url: '/library' },
    ],
  },
  {
    title: 'Partners',
    icon: Building03Icon,
    children: [
      { title: 'OEM Brands', url: '/oem-brands' },
    ],
  },
  {
    title: 'System',
    icon: Settings02Icon,
    children: [
      { title: 'Tasks', url: '/tasks' },
      { title: 'BullMQ Jobs', url: '/jobs' },
      { title: 'Providers', url: '/providers' },
      { title: 'Admin Providers', url: '/admin-providers' },
      { title: 'Dead Letters', url: '/dead-letters' },
    ],
  },
  {
    title: 'Lab',
    icon: IdeaIcon,
    children: [
      { title: 'Magi', url: '/magi' },
      { title: 'Ideas', url: '/ideas' },
    ],
  },
];

/**
 * App sidebar props
 * 应用侧边栏属性
 */
type AppSidebarProps = {
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
};

/**
 * App Sidebar Component
 * 应用侧边栏组件
 *
 * Renders the main navigation sidebar with:
 * - User button at the top
 * - Collapsible menu groups
 * - Active route highlighting
 *
 * 渲染主导航侧边栏，包含：
 * - 顶部用户按钮
 * - 可折叠菜单组
 * - 当前路由高亮
 */
export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // Track mounted state for hydration safety
  // 跟踪挂载状态以确保水合安全
  const [mounted, setMounted] = useState(false);

  // Track open state for each collapsible menu
  // 跟踪每个可折叠菜单的展开状态
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  /**
   * Calculate initial open state based on current pathname
   * 根据当前路径计算初始展开状态
   */
  const getInitialOpenState = () => {
    const state: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children) {
        state[item.title] = item.children.some((child) =>
          child.url === '/' ? pathname === '/' : pathname.startsWith(child.url)
        );
      }
    });
    return state;
  };

  // Initialize on mount and update when pathname changes
  // 挂载时初始化，路径变化时更新
  useEffect(() => {
    setMounted(true);
    setOpenMenus(getInitialOpenState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Render skeleton during SSR to avoid hydration mismatch
  // SSR 期间渲染骨架屏以避免水合不匹配
  if (!mounted) {
    return (
      <Sidebar collapsible="icon">
        <div className="flex flex-col p-4 space-y-4">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
      </Sidebar>
    );
  }

  /**
   * Check if a URL is active
   * 检查 URL 是否为当前活动路由
   */
  const isActive = (url: string) => {
    if (url === '/') return pathname === '/';
    return pathname.startsWith(url);
  };

  /**
   * Check if any child in a group is active
   * 检查组中是否有任何子项为活动状态
   */
  const isGroupActive = (children?: { url: string }[]) => {
    if (!children) return false;
    return children.some((child) => isActive(child.url));
  };

  /**
   * Toggle a menu's open state
   * 切换菜单的展开状态
   */
  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header with user button */}
      <SidebarHeader className="border-b">
        <UserButton user={user} onSignOut={signOut} />
      </SidebarHeader>

      {/* Navigation content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Simple menu item (no children)
                // 简单菜单项（无子项）
                if (!item.children && item.url) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link href={item.url} className="w-full">
                        <SidebarMenuButton isActive={isActive(item.url)} tooltip={item.title}>
                          <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                }

                // Collapsible menu item (with children)
                // 可折叠菜单项（有子项）
                return (
                  <Collapsible
                    key={item.title}
                    open={openMenus[item.title] ?? false}
                    onOpenChange={() => toggleMenu(item.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        nativeButton={true}
                        render={
                          <SidebarMenuButton
                            isActive={isGroupActive(item.children)}
                            tooltip={item.title}
                          />
                        }
                      >
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                        <span>{item.title}</span>
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          strokeWidth={2}
                          className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children?.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton
                                render={(props) => <Link {...props} href={child.url} />}
                                isActive={isActive(child.url)}
                              >
                                <span>{child.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
