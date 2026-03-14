import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalApp } from '../react/components/TerminalApp';

vi.mock('../react/components/TerminalTab', () => ({
  TerminalTab: ({ tab }: any) => (
    <div data-testid={`terminal-tab-${tab.id}`} data-tab-title={tab.title} />
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  X: () => <span data-testid="x-icon">×</span>,
}));

/** Helper: get the tab bar container (the flex row that holds tab items + add button). */
function getTabBar() {
  // The tab bar is the scrollable flex container holding tab items
  return screen.getByTitle('New tab').parentElement!;
}

/** Helper: click a tab bar item by its title text. */
function getTabBarItem(title: string) {
  const tabBar = getTabBar();
  return within(tabBar).getByText(title).closest('[class*="cursor-pointer"]')! as HTMLElement;
}

describe('TerminalApp', () => {
  describe('Tab Management', () => {
    it('renders with one default tab "courier_cli"', () => {
      render(<TerminalApp />);
      const tabBar = getTabBar();
      expect(within(tabBar).getByText('courier_cli')).toBeInTheDocument();
    });

    it('shows the active tab content', () => {
      render(<TerminalApp />);
      expect(screen.getByTestId('terminal-tab-1')).toBeInTheDocument();
    });

    it('clicking "+" adds a new tab with incremented title', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));

      const tabBar = getTabBar();
      expect(within(tabBar).getByText('courier_2')).toBeInTheDocument();
    });

    it('new tab becomes active when added', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));

      // Old tab content should be gone; new tab content visible
      expect(screen.queryByTestId('terminal-tab-1')).not.toBeInTheDocument();
      const tabContents = screen.getAllByTestId(/^terminal-tab-/);
      expect(tabContents).toHaveLength(1);
      expect(tabContents[0]).toHaveAttribute('data-tab-title', 'courier_2');
    });

    it('can switch between tabs by clicking tab buttons', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));
      expect(screen.queryByTestId('terminal-tab-1')).not.toBeInTheDocument();

      // Click on the first tab in the tab bar to switch back
      await user.click(getTabBarItem('courier_cli'));
      expect(screen.getByTestId('terminal-tab-1')).toBeInTheDocument();
    });

    it('can close a tab that is not active', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));

      // Switch back to first tab
      await user.click(getTabBarItem('courier_cli'));

      // Close courier_2 (inactive) via its X button
      const courier2Tab = getTabBarItem('courier_2');
      await user.click(within(courier2Tab).getByTestId('x-icon'));

      const tabBar = getTabBar();
      expect(within(tabBar).queryByText('courier_2')).not.toBeInTheDocument();
      expect(within(tabBar).getByText('courier_cli')).toBeInTheDocument();
    });

    it('closing the active tab switches to the last remaining tab', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));

      // Switch back to first tab (make it active)
      await user.click(getTabBarItem('courier_cli'));

      // Close the active tab (courier_cli)
      const cliTab = getTabBarItem('courier_cli');
      await user.click(within(cliTab).getByTestId('x-icon'));

      // courier_2 should now be active and its content rendered
      const tabBar = getTabBar();
      expect(within(tabBar).queryByText('courier_cli')).not.toBeInTheDocument();
      const tabContents = screen.getAllByTestId(/^terminal-tab-/);
      expect(tabContents).toHaveLength(1);
      expect(tabContents[0]).toHaveAttribute('data-tab-title', 'courier_2');
    });

    it('cannot close the last remaining tab (close button invisible)', () => {
      render(<TerminalApp />);

      const closeBtn = screen.getByTestId('x-icon').closest('button')!;
      expect(closeBtn).toHaveClass('invisible');
    });

    it('after closing a tab, the remaining tabs are still correct', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab')); // courier_2
      await user.click(screen.getByTitle('New tab')); // courier_3

      // Close courier_2 (middle tab)
      const courier2Tab = getTabBarItem('courier_2');
      await user.click(within(courier2Tab).getByTestId('x-icon'));

      const tabBar = getTabBar();
      expect(within(tabBar).getByText('courier_cli')).toBeInTheDocument();
      expect(within(tabBar).queryByText('courier_2')).not.toBeInTheDocument();
      expect(within(tabBar).getByText('courier_3')).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('renders macOS traffic light dots', () => {
      const { container } = render(<TerminalApp />);

      const redDot = container.querySelector('.bg-red-500\\/80');
      const yellowDot = container.querySelector('.bg-yellow-500\\/80');
      const greenDot = container.querySelector('.bg-green-500\\/80');

      expect(redDot).toBeInTheDocument();
      expect(yellowDot).toBeInTheDocument();
      expect(greenDot).toBeInTheDocument();
    });

    it('renders the "courier_cli" branding text', () => {
      render(<TerminalApp />);

      // Tab title + branding area both display "courier_cli"
      const brandingElements = screen.getAllByText('courier_cli');
      expect(brandingElements.length).toBeGreaterThanOrEqual(2);
    });

    it('active tab has distinct styling vs inactive', async () => {
      const user = userEvent.setup();
      render(<TerminalApp />);

      await user.click(screen.getByTitle('New tab'));

      const cliTab = getTabBarItem('courier_cli');
      const courier2Tab = getTabBarItem('courier_2');

      // Active tab (courier_2) has active styling
      expect(courier2Tab).toHaveClass('bg-[#0d0118]');
      expect(courier2Tab).toHaveClass('text-pink-400');

      // Inactive tab (courier_cli) has inactive styling
      expect(cliTab).toHaveClass('bg-[#1a0b2e]');
      expect(cliTab).toHaveClass('text-zinc-400');
    });
  });
});
