import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { loadAssertions, setSource } from "../data";
import { createMockSource, BARRIER_REPLY, KEY_ADDED_REPLY } from "../data/mockSource";
import { TipCard } from "../components/TipCard";

function go(url: string) {
  window.history.pushState(null, "", url);
}

beforeEach(() => {
  setSource(createMockSource({ delay: 0 }));
});

describe("thread page", () => {
  it("renders 12 messages, one capture line and the question; one tap answers it and shows the notification", async () => {
    const src = createMockSource({ delay: 0 });
    const answer = vi.spyOn(src, "answer");
    setSource(src);
    go("/thread/thread-001");
    render(<App />);

    await screen.findByText(/does it apply to TRN-087 too/);
    expect(screen.getAllByRole("article")).toHaveLength(13); // 12 messages + the question
    expect(screen.getAllByText("Saved as a tip. Nothing for you to do.")).toHaveLength(1);
    expect(screen.getByText("Asked once. Your answer is remembered.")).toBeTruthy();
    expect(screen.queryByText(/your tip was used/)).toBeNull();

    const option = screen.getByRole("button", { name: "All older units" });
    await act(async () => fireEvent.click(option));
    expect(answer).toHaveBeenCalledWith("CA-0001", 0);
    await screen.findByText(/Answered: All older units/);
    expect(screen.queryByRole("button", { name: "All older units" })).toBeNull();
    expect(screen.getByText("Erkki, your tip was used on TRN-087 today")).toBeTruthy();
  });

  it("shows no metadata or AI badges", async () => {
    go("/thread/thread-001");
    render(<App />);
    await screen.findByText(/does it apply/);
    expect(document.body.textContent).not.toMatch(/assertion|confidence|\bAI\b/i);
  });
});

describe("tip card", () => {
  it("three lines, trust in words, and the replaced note on CA-0003", async () => {
    const all = await loadAssertions(createMockSource({ delay: 0 }));
    const tip = all.find((a) => a.id === "CA-0003")!;
    render(<TipCard tip={tip} all={all} onClose={() => {}} />);
    const card = screen.getByRole("dialog");
    expect(card.querySelectorAll("p")).toHaveLength(3);
    expect(card.textContent).toContain("Site access");
    expect(card.textContent).toContain("Stated, not yet verified");
    expect(card.textContent).toContain("Replaced earlier info from 2 Oct.");
  });
});

describe("map page and chat", () => {
  it("the map renders tips as buttons, and the chat is collapsed by default", async () => {
    go("/");
    render(<App />);
    await screen.findByRole("button", { name: "Bounce, don't reboot" });
    expect(screen.getByRole("button", { name: /Ask or add context/ })).toBeTruthy();
    expect(screen.queryByLabelText("Message")).toBeNull();
    expect(within(screen.getByRole("list", { name: "Tips in view" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("the hunch toggle shows CA-0005", async () => {
    go("/");
    render(<App />);
    await screen.findByRole("button", { name: "Bounce, don't reboot" });
    expect(screen.queryByRole("button", { name: "Upgrade firmware to 5.0" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Show unconfirmed hunches"));
    expect(screen.getByRole("button", { name: "Upgrade firmware to 5.0" })).toBeTruthy();
  });

  it("both scripted exchanges work, and the replied tip gets the ring", async () => {
    go("/?focus=OULU-03");
    render(<App />);
    await screen.findByRole("button", { name: "Site access" });
    fireEvent.click(screen.getByRole("button", { name: /Ask or add context/ }));
    const input = screen.getByLabelText("Message");

    fireEvent.change(input, { target: { value: "Anything I should know about OULU-03 before I drive out?" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    await screen.findByText(BARRIER_REPLY);
    expect(screen.getByRole("button", { name: "Site access" }).className).toContain("ring");

    fireEvent.change(input, { target: { value: "The key moved, it's in the site cabinet now" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    await screen.findByText(KEY_ADDED_REPLY);
  });

  it("shows the fallback message when chat() is absent", async () => {
    setSource(createMockSource({ delay: 0, withChat: false }));
    go("/");
    render(<App />);
    await screen.findByRole("button", { name: "Bounce, don't reboot" });
    fireEvent.click(screen.getByRole("button", { name: /Ask or add context/ }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "The key moved" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    await screen.findByText(/isn't connected yet/);
  });
});

describe("zoomed out: the Finland map", () => {
  it("shows regions only; a region opens its diagram", async () => {
    go("/?zoom=out");
    render(<App />);
    const north = await screen.findByRole("button", { name: "North Ostrobothnia Pohjois-Pohjanmaa 3 tips" });
    expect(document.querySelectorAll(".tip-node, .tip-dot")).toHaveLength(0);
    await act(async () => fireEvent.click(north));
    expect(window.location.search).toBe("?focus=region%3Anorth_ostrobothnia");
    await screen.findByRole("button", { name: "Site access" });
  });
});

describe("zoom and drag", () => {
  const world = () => document.querySelector<HTMLElement>(".map-world")!.style.transform;
  const scaleOf = () => Number(/scale\(([\d.]+)\)/.exec(world())![1]);

  it("+ and − zoom, Fit goes back to the framed view", async () => {
    go("/");
    render(<App />);
    await screen.findByRole("button", { name: "Bounce, don't reboot" });
    const fitted = world();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(scaleOf()).toBeGreaterThan(Number(/scale\(([\d.]+)\)/.exec(fitted)![1]));
    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(world()).toBe(fitted);
  });

  it("dragging pans the map, and a drag that ends on a tip doesn't open it", async () => {
    go("/");
    render(<App />);
    const tip = await screen.findByRole("button", { name: "Bounce, don't reboot" });
    const canvas = document.querySelector(".map-canvas")!;
    const before = world();
    fireEvent.pointerDown(tip, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 160, clientY: 130 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 160, clientY: 130 });
    fireEvent.click(tip);
    expect(world()).not.toBe(before);
    expect(screen.queryByRole("dialog")).toBeNull();
    // A plain click (no drag) still opens it.
    fireEvent.click(tip);
    expect(screen.getByRole("dialog", { name: "Bounce, don't reboot" })).toBeTruthy();
  });

  it("the wheel zooms around the pointer", async () => {
    go("/");
    render(<App />);
    await screen.findByRole("button", { name: "Bounce, don't reboot" });
    const k = scaleOf();
    fireEvent.wheel(document.querySelector(".map-canvas")!, { deltaY: -300, clientX: 200, clientY: 200 });
    expect(scaleOf()).toBeGreaterThan(k);
  });
});

describe("title card", () => {
  it.each([
    ["capture", "Capture", 1],
    ["bind", "Bind", 2],
    ["recall", "Recall", 3],
    ["stay-true", "Stay true", 4],
  ])("%s renders at 1920×1080", (slug, word, n) => {
    go(`/title/${slug}`);
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(word);
    expect(screen.getByText(`Chapter ${n} of 4`)).toBeTruthy();
    expect(document.querySelector<HTMLElement>(".title-card")!.style.width).toBe("1920px");
    expect(screen.queryByText("0 forms · 1 tap")).toBeNull();
  });

  it("?counter=1 adds the counter", () => {
    go("/title/recall?counter=1");
    render(<App />);
    expect(screen.getByText("0 forms · 1 tap")).toBeTruthy();
  });
});

describe("beat replay", () => {
  it.each([1, 2, 3, 4, 5, 6])("beat %i loads on the map and the thread", async (n) => {
    go(`/?beat=${n}`);
    const map = render(<App />);
    await screen.findByText(new RegExp(`^Beat ${n}:`));
    map.unmount();
    go(`/thread/thread-001?beat=${n}`);
    render(<App />);
    await screen.findByText(new RegExp(`^Beat ${n}:`));
  });

  it("beat 3 focuses TRN-087 with CA-0001 selected; beat 6 shows the cabinet key", async () => {
    go("/?beat=3");
    const r = render(<App />);
    await screen.findByText("Around TRN-087");
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Bounce, don't reboot" })).toBeTruthy());
    r.unmount();
    go("/?beat=6");
    render(<App />);
    await screen.findByText("Around Forest mast, private road (OULU-03)");
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Site access" }).textContent).toContain("in the site cabinet"));
  });

  it("beat 2 shows the capture line; beat 1 does not", async () => {
    go("/thread/thread-001?beat=2");
    const r = render(<App />);
    await screen.findByText("Saved as a tip. Nothing for you to do.");
    r.unmount();
    go("/thread/thread-001?beat=1");
    render(<App />);
    await screen.findByText(/^Beat 1:/);
    expect(screen.queryByText("Saved as a tip. Nothing for you to do.")).toBeNull();
  });

  it("?clean=1 hides the controls", async () => {
    go("/thread/thread-001?beat=2&clean=1");
    render(<App />);
    await screen.findByText("Saved as a tip. Nothing for you to do.");
    expect(screen.queryByRole("navigation", { name: "Beat replay" })).toBeNull();
  });
});
