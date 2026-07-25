import { Command, ListOrdered, Search, type LucideIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import Logo from '../assets/atarialogo.png'
import { Dialog, DialogContent, DialogHeader } from '../components/ui/Dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/Tooltip'
import { Link } from 'react-router-dom'
import UserButton from '../components/ui/UserButton'

const TopMenu = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="flex justify-between items-center px-4 h-11 shrink-0 border-b border-background-lable bg-background w-full">
            {/* Logo Section */}
            <div className="flex items-center h-full">
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link to="/" className="flex items-center gap-2 group cursor-pointer p-1 rounded-md transition-colors hover:bg-background-lable">
                                <img 
                                    src={Logo} 
                                    draggable={false} 
                                    className="size-5 select-none transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" 
                                    alt="ataria logo" 
                                />
                                <span className="text-sm font-medium text-foreground tracking-wide">
                                    Ataria
                                </span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Go to Home</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Search Section */}
            <div className="lg:flex hidden items-center">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button 
                                    onClick={() => setIsOpen(true)}
                                    className="group rounded-md lg:min-w-80 px-3 h-7 bg-background-lable/50 border border-transparent hover:border-background-lable hover:bg-background-lable cursor-pointer flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow"
                                >
                                    <div className="flex gap-2 items-center">
                                        <Search className="size-3.5 text-foreground-label group-hover:text-foreground transition-all duration-300 group-hover:scale-110" />
                                        <span className="text-xs text-foreground-label select-none group-hover:text-foreground transition-colors">
                                            Search...
                                        </span>
                                    </div>
                                    <div className="flex items-center text-foreground-label group-hover:text-foreground transition-colors gap-0.5">
                                        <Command className="size-3" />
                                        <span className="text-[10px] font-semibold tracking-wider">K</span>
                                    </div>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Quick Search</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
                        <DialogHeader className="px-3 py-2 border-b border-background-lable">
                            <div className="mt-1 flex items-center gap-2">
                                <Search className="size-5 text-foreground-label" />
                                <input
                                    id="search"
                                    autoFocus
                                    className="flex py-1.5 w-full bg-transparent px-1 text-sm placeholder:text-foreground-label text-foreground focus:outline-none"
                                    placeholder="Type a command or search..."
                                />
                            </div>
                        </DialogHeader>
                        <div className="space-y-1 p-4 min-h-30 flex items-center justify-center text-sm text-foreground-label">
                            No recent searches
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2 h-full">
                <PageNavButton 
                    link="/watchlist" 
                    TriggerIcon={ListOrdered} 
                    description="Custom Watchlist" 
                />
                
                <div className="h-4 w-px bg-background-lable mx-1" />
      
                    <UserButton />
          
            </div>
        </header>
    )
}

export default TopMenu

const PageNavButton = ({ 
    TriggerIcon, 
    description, 
    link 
}: { 
    TriggerIcon: LucideIcon, 
    description: string, 
    link: string 
}) => {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link 
                        to={link}
                        className="group p-1.5 rounded-md hover:bg-background-lable transition-colors flex items-center justify-center"
                    >
                        <TriggerIcon className="size-4.5 text-foreground-label group-hover:text-foreground transition-all duration-300 group-hover:scale-110" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                    {description}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}