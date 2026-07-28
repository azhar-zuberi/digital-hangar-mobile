import { fireEvent, render } from '@testing-library/react-native';

import { AircraftSwitcher } from '../AircraftSwitcher';

// Covers issue #35's aircraft switcher acceptance criteria: renders one
// option per owned aircraft, marks the current selection, and reports the
// tapped aircraft's id back to the caller (HomeScreen owns persisting it as
// the new last-used aircraft, not this component).
describe('AircraftSwitcher', () => {
  const options = [
    { id: 'a', registration: 'N111AA' },
    { id: 'b', registration: 'N222BB' },
  ];

  it('renders a pill for every option', async () => {
    const { getByText } = await render(
      <AircraftSwitcher options={options} selectedId="a" onSelect={jest.fn()} />,
    );

    expect(getByText('N111AA')).toBeTruthy();
    expect(getByText('N222BB')).toBeTruthy();
  });

  it('marks the selected option as accessibility-selected', async () => {
    const { getByLabelText } = await render(
      <AircraftSwitcher options={options} selectedId="b" onSelect={jest.fn()} />,
    );

    expect(getByLabelText('Switch to N111AA').props.accessibilityState.selected).toBe(false);
    expect(getByLabelText('Switch to N222BB').props.accessibilityState.selected).toBe(true);
  });

  it('calls onSelect with the tapped aircraft id', async () => {
    const onSelect = jest.fn();
    const { getByLabelText } = await render(
      <AircraftSwitcher options={options} selectedId="a" onSelect={onSelect} />,
    );

    fireEvent.press(getByLabelText('Switch to N222BB'));

    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
