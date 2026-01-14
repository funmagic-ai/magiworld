'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  FolderLibraryIcon,
  AiGenerativeIcon,
  ArrowDown01Icon,
  Building03Icon,
} from '@hugeicons/core-free-icons';

type MenuItem = {
  title: string;
  url?: string;
  icon: typeof Home01Icon;
  children?: { title: string; url: string }[];
};

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home01Icon,
  },
  {
    title: 'Banners',
    icon: Image01Icon,
    children: [
      { title: 'Homepage', url: '/banners' },
    ],
  },
  {
    title: 'AI Tools',
    icon: AiGenerativeIcon,
    children: [
      { title: 'Tool Types', url: '/tool-types' },
      { title: 'Tools', url: '/tools' },
    ],
  },
  {
    title: 'Assets',
    icon: FolderLibraryIcon,
    children: [
      { title: 'Library', url: '/library' },
      { title: 'Ideas', url: '/ideas' },
      { title: 'Magi', url: '/magi' },
    ],
  },
  {
    title: 'OEM',
    icon: Building03Icon,
    children: [
      { title: 'Brands', url: '/oem-brands' },
    ],
  },
];

type AppSidebarProps = {
  footer?: React.ReactNode;
};

export function AppSidebar({ footer }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === '/') return pathname === '/';
    return pathname.startsWith(url);
  };

  const isGroupActive = (children?: { url: string }[]) => {
    if (!children) return false;
    return children.some((child) => isActive(child.url));
  };

  // Track open state for each collapsible menu
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Initialize open state based on active routes (only once on mount)
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children) {
        initialState[item.title] = isGroupActive(item.children);
      }
    });
    setOpenMenus(initialState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex h-12 items-center gap-2 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">M</span>
          </div>
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Simple menu item (no children)
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
                return (
                  <Collapsible
                    key={item.title}
                    open={openMenus[item.title] ?? false}
                    onOpenChange={() => toggleMenu(item.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
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
                                render={<Link href={child.url} />}
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
      {footer && (
        <SidebarFooter className="border-t">
          {footer}
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
