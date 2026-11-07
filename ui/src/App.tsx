import { MapPage } from "./pages/MapPage";
import { ThreadPage } from "./pages/ThreadPage";
import { TitleCard } from "./pages/TitleCard";
import { parseRoute, useLocation } from "./router";

export function App() {
  const { pathname } = useLocation();
  const route = parseRoute(pathname);
  switch (route.page) {
    case "map":
      return <MapPage />;
    case "thread":
      return <ThreadPage key={route.id} id={route.id} />;
    case "title":
      return <TitleCard chapter={route.chapter} />;
    default:
      return (
        <main className="thread-page">
          <p>
            Nothing here. Try <a href="/">the context map</a> or <a href="/thread/thread-001">the thread</a>.
          </p>
        </main>
      );
  }
}
