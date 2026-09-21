import { Bell } from 'lucide-react';
import { HomeBrand } from './HomeBrand';
import { HomeChatBar } from './HomeChatBar';

export function HomeHeader() {
  return (
    <header className="home-topbar">
      <div className="home-mobile-header">
        <HomeBrand />
      </div>
      <HomeChatBar id="ask-desktop" />
      <button className="home-bell" type="button" aria-label="Notifications">
        <Bell size={23} />
        <i />
      </button>
    </header>
  );
}
