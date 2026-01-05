import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { 
  LayoutDashboard, 
  Folder, 
  Layers, 
  Box, 
  Search, 
  Bell, 
  Plus,
  Palette,
  Check,
  Monitor,
  HardDrive,
  ShoppingBag,
  PenTool,
  Wand2,
  Sparkles,
  Cpu,
  Zap,
  MousePointer2,
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  ChevronRight,
  ArrowRight,
  Stars,
  Cuboid as Cube,
  Maximize2
} from 'lucide-react';

// --- 基础原子组件 (Atomic Components) ---

const Button = ({ variant = 'primary', size = 'default', className = '', children, ...props }) => {
  const variants = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 shadow-lg shadow-[var(--primary)]/20',
    outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
    ghost: 'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
    secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10'
  };

  return (
    <button 
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${className}`}>
    {children}
  </div>
);

// --- 核心子视图 (Core Views) ---

// 1. 首页探索 (Explore View - 带有 Banner)
const ExploreView = ({ onStartProject }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 顶部视觉 Banner */}
      <section className="relative h-72 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white group">
        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        {/* 装饰性光效 */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary)]/30 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-12 -translate-y-1/2 z-10 space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--primary)]/20 rounded-full text-[var(--primary)] text-xs font-bold border border-[var(--primary)]/30">
            <Sparkles size={12} />
            <span>AI 2.0 创作引擎现已开启</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight leading-tight">
            从灵感到现实，<br />只需轻轻一触。
          </h1>
          <p className="text-slate-400 text-sm max-w-sm">
            探索全球创作者的数百万个模版，或使用 AI 实验室功能快速生成属于您的独特设计。
          </p>
          <div className="flex gap-4 pt-2">
            <Button size="lg" className="gap-2 group" onClick={onStartProject}>
              立即开始创作 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="lg">查看教程</Button>
          </div>
        </div>
        <div className="absolute right-12 bottom-0 h-64 w-64 opacity-20 group-hover:opacity-40 transition-opacity">
           <PenTool size={256} className="rotate-12 translate-y-10" />
        </div>
      </section>

      {/* 快捷操作区 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20 flex flex-col justify-between h-40 group cursor-pointer hover:bg-[var(--primary)]/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white">
            <Plus size={24} />
          </div>
          <div>
            <h3 className="font-bold">新建空白项目</h3>
            <p className="text-xs text-[var(--muted-foreground)]">从零开始你的自由创作</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-[var(--border)] flex flex-col justify-between h-40 group cursor-pointer hover:border-[var(--primary)] transition-all">
          <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h3 className="font-bold">从模版开始</h3>
            <p className="text-xs text-[var(--muted-foreground)]">2000+ 专业设计模版库</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-[var(--border)] flex flex-col justify-between h-40 group cursor-pointer hover:border-[var(--primary)] transition-all">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <Wand2 size={20} />
          </div>
          <div>
            <h3 className="font-bold">AI 辅助生成</h3>
            <p className="text-xs text-[var(--muted-foreground)]">输入描述词快速获取灵感</p>
          </div>
        </div>
      </section>

      {/* 社区灵感 */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">为您推荐</h2>
          <div className="flex gap-2">
            {['全部', '热门', '最新'].map(t => <Button key={t} variant="ghost" size="sm">{t}</Button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="group overflow-hidden">
               <div className="aspect-[4/3] bg-[var(--muted)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <Button variant="glass" size="sm">立即使用</Button>
                  </div>
               </div>
               <div className="p-4">
                 <h4 className="font-bold text-sm">3D 拼图 - 复古相机模型</h4>
                 <div className="flex items-center justify-between mt-3">
                   <span className="text-[10px] text-[var(--muted-foreground)]">1.2k 使用</span>
                   <div className="flex gap-1">
                     <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                   </div>
                 </div>
               </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

// 2. AI LAB 视图 (新功能区域)
const AILabView = () => {
  const aiTools = [
    { 
      title: "AI 图像风格化", 
      desc: "将任何照片转化为适合激光雕刻的素描、波普或木刻风格。", 
      icon: ImageIcon,
      tag: "Beta",
      color: "bg-blue-500"
    },
    { 
      title: "AI 3D 转换", 
      desc: "上传 2D 剪影图片，AI 自动生成可拼接的 3D 层级结构。", 
      icon: Cube,
      tag: "Experimental",
      color: "bg-purple-500"
    },
    { 
      title: "智能矢量化", 
      desc: "一键清除背景并将低清位图转化为高质量矢量路径。", 
      icon: Wand2,
      tag: "Stable",
      color: "bg-green-500"
    },
    { 
      title: "创意文字生成", 
      desc: "输入关键词，生成带有特殊纹理和连接处的切割文字。", 
      icon: Type,
      tag: "Hot",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black flex items-center gap-3">
          <Stars className="text-[var(--primary)]" size={36} />
          AI LAB 实验室
        </h1>
        <p className="text-[var(--muted-foreground)] text-lg">基于生成式人工智能，让机器更懂你的设计。预览最新技术成果。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {aiTools.map((tool, idx) => (
          <Card key={idx} className="p-8 flex flex-col justify-between group cursor-pointer border-2 border-transparent hover:border-[var(--primary)]/40 relative overflow-hidden">
             {/* 背景光晕 */}
             <div className={`absolute -right-20 -top-20 w-48 h-48 ${tool.color} opacity-[0.03] rounded-full blur-[60px] group-hover:opacity-10 transition-opacity`} />
             
             <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl ${tool.color} flex items-center justify-center text-white shadow-lg`}>
                    <tool.icon size={28} />
                  </div>
                  <span className="px-2 py-1 rounded-md bg-[var(--muted)] text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-tighter">
                    {tool.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{tool.title}</h3>
                  <p className="text-[var(--muted-foreground)] text-sm mt-2 leading-relaxed">{tool.desc}</p>
                </div>
             </div>
             <div className="mt-8 flex items-center justify-between relative z-10">
                <Button variant="outline" className="gap-2">进入功能 <ChevronRight size={14}/></Button>
                <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                  <Zap size={10} /> 消耗云端算力
                </div>
             </div>
          </Card>
        ))}
      </div>

      {/* 底部推广 */}
      <Card className="bg-gradient-to-r from-[var(--primary)] to-emerald-600 p-8 text-white border-none flex items-center justify-between">
         <div className="space-y-2">
           <h3 className="text-2xl font-bold">想要更多 AI 功能？</h3>
           <p className="opacity-80">申请加入“创作者激励计划”，优先体验最新的生成式 AI 功能。</p>
         </div>
         <Button variant="glass" className="px-10">立即申请</Button>
      </Card>
    </div>
  );
};

// 3. 设计视图 (Canvas View)
const DesignView = () => (
  <div className="h-full border border-[var(--border)] rounded-3xl bg-[#f8f9fa] dark:bg-[#0c0c0e] flex flex-col overflow-hidden relative shadow-inner">
    <div className="h-14 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md flex items-center px-4 justify-between">
      <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon"><MousePointer2 size={16}/></Button>
         <Button variant="ghost" size="icon"><Square size={16}/></Button>
         <Button variant="ghost" size="icon"><Circle size={16}/></Button>
         <Button variant="ghost" size="icon"><Type size={16}/></Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">画布大小: 600 x 400 mm</span>
        <Button size="sm">保存设计</Button>
      </div>
    </div>
    <div className="flex-1 flex items-center justify-center relative">
       <div className="w-[80%] h-[70%] bg-white dark:bg-slate-900 shadow-2xl border border-[var(--border)] rounded-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--primary)]/5">
             <PenTool size={200} />
          </div>
       </div>
    </div>
  </div>
);

// --- 主布局框架 ---

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const themes = [
    { id: 'green', color: '#00E676', value: 'green' },
    { id: 'blue', color: '#3b82f6', value: 'blue' },
    { id: 'purple', color: '#a855f7', value: 'purple' },
    { id: 'orange', color: '#f97316', value: 'orange' },
  ];

  return (
    <div className="flex justify-between items-center p-2 bg-[var(--muted)]/50 rounded-2xl border border-[var(--border)]">
      <div className="flex gap-1.5 ml-1">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.value)}
            className={`w-5 h-5 rounded-full transition-all hover:scale-125 ${theme === t.value ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : 'opacity-40'}`}
            style={{ backgroundColor: t.color }}
          />
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-6 w-6 rounded-full p-0">
        <Palette size={14} />
      </Button>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all rounded-xl group ${
      active 
        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20' 
        : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    {badge && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
  </div>
);

const StudioApp = () => {
  const [activeView, setActiveView] = useState('explore');

  const renderContent = () => {
    switch (activeView) {
      case 'explore': return <ExploreView onStartProject={() => setActiveView('design')} />;
      case 'ai-lab': return <AILabView />;
      case 'design': return <DesignView />;
      case 'projects': return <div className="text-center py-40 text-[var(--muted-foreground)]">您的项目库为空</div>;
      default: return <ExploreView />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* 侧边栏 */}
      <aside className="w-64 border-r border-[var(--border)] flex flex-col bg-[var(--card)] z-30">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-[var(--primary-foreground)] shadow-xl rotate-3">
              <Sparkles size={24} />
            </div>
            <span>STUDIO</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavItem icon={LayoutDashboard} label="首页探索" active={activeView === 'explore'} onClick={() => setActiveView('explore')} />
          <NavItem icon={Folder} label="我的项目" active={activeView === 'projects'} onClick={() => setActiveView('projects')} />
          <NavItem icon={ShoppingBag} label="材料商城" />
          
          <div className="pt-6 pb-2 px-4">
             <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em]">智能功能</p>
          </div>
          <NavItem 
            icon={Stars} 
            label="AI LAB" 
            active={activeView === 'ai-lab'} 
            onClick={() => setActiveView('ai-lab')} 
            badge="NEW"
          />
          <NavItem icon={Layers} label="设计画布" active={activeView === 'design'} onClick={() => setActiveView('design')} />
        </nav>

        <div className="p-6 mt-auto space-y-4">
          <ThemeSwitcher />
          <div className="p-4 rounded-2xl bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute -right-2 -bottom-2 opacity-10 rotate-12"><HardDrive size={64}/></div>
             <p className="text-[10px] font-bold opacity-60 mb-2 flex justify-between items-center">
                <span>云端配额</span>
                <span>256MB/512MB</span>
             </p>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="bg-[var(--primary)] h-full w-1/2" />
             </div>
          </div>
        </div>
      </aside>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-[var(--border)] flex items-center justify-between px-10 bg-[var(--card)]/80 backdrop-blur-xl z-20 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="relative w-80 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors" size={16} />
               <input type="text" placeholder="搜索资源、AI 指令..." className="w-full bg-[var(--muted)]/50 border border-transparent focus:border-[var(--primary)] rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-4 focus:ring-[var(--primary)]/5 outline-none transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-2xl border border-[var(--border)]">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[var(--card)]" />
            </Button>
            <div className="flex items-center gap-3 bg-[var(--muted)]/50 border border-[var(--border)] pl-1.5 pr-4 py-1.5 rounded-2xl cursor-pointer hover:shadow-lg transition-all group">
               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-md group-hover:rotate-12 transition-transform">X</div>
               <div className="flex flex-col">
                  <span className="text-xs font-black leading-none">MAKER_HUB</span>
                  <span className="text-[9px] text-[var(--muted-foreground)] font-bold">LV.12 创作者</span>
               </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
           {renderContent()}
        </div>
      </main>

      <style>{`
        :root {
          --background: #ffffff;
          --foreground: #09090b;
          --card: #ffffff;
          --primary: #00E676;
          --primary-foreground: #ffffff;
          --secondary: #f4f4f5;
          --secondary-foreground: #18181b;
          --muted: #f4f4f5;
          --muted-foreground: #71717a;
          --accent: #f4f4f5;
          --accent-foreground: #18181b;
          --border: #e4e4e7;
        }

        [data-theme='blue'] { --primary: #3b82f6; }
        [data-theme='purple'] { --primary: #a855f7; }
        [data-theme='orange'] { --primary: #f97316; }

        .dark {
          --background: #09090b;
          --foreground: #fafafa;
          --card: #0c0c0e;
          --muted: #18181b;
          --border: #27272a;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        
        body { font-family: 'Inter', -apple-system, system-ui, sans-serif; }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="green">
      <StudioApp />
    </ThemeProvider>
  );
}