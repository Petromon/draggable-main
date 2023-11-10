import {
  createSandbox,
  waitForRequestAnimationFrame,
  clickMouse,
  moveMouse,
  releaseMouse,
  waitForDragDelay,
  waitForPromisesToResolve,
  DRAG_DELAY,
  drag,
} from 'helper';
import {FixMeAny} from 'shared/types';

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import Draggable from '../../../Draggable';
/* eslint-enable @typescript-eslint/ban-ts-comment */
import ResizeMirror from '..';

const sampleMarkup = `
  <ul class="Container">
    <li>Smaller item</li>
  </ul>
  <ul class="Container">
    <li>Larger item</li>
  </ul>
  <ul class="Container">
    <!-- Empty -->
  </ul>
`;

describe('ResizeMirror', () => {
  const smallerDraggableDimensions = {
    width: 100,
    height: 30,
  };

  const largerDraggableDimensions = {
    width: smallerDraggableDimensions.width * 2,
    height: smallerDraggableDimensions.height * 2,
  };

  let sandbox: HTMLDivElement;
  let containers: HTMLElement[];
  let draggable: FixMeAny;
  let draggables: HTMLElement[];
  let smallerDraggable: HTMLElement;
  let largerDraggable: HTMLElement;

  beforeEach(() => {
    sandbox = createSandbox(sampleMarkup);
    containers = [...sandbox.querySelectorAll<HTMLElement>('.Container')];
    draggables = [...sandbox.querySelectorAll<HTMLElement>('li')];

    smallerDraggable = draggables[0];
    largerDraggable = draggables[1];

    mockDimensions(smallerDraggable, smallerDraggableDimensions);
    mockDimensions(largerDraggable, largerDraggableDimensions);

    draggable = new Draggable(containers, {
      draggable: 'li',
      delay: DRAG_DELAY,
      plugins: [ResizeMirror],
    });
  });

  afterEach(() => {
    draggable.destroy();
    sandbox.remove();
  });

  it('resizes mirror based on over element', async () => {
    clickMouse(smallerDraggable);
    waitForDragDelay();
    await waitForPromisesToResolve();

    const mirror = document.querySelector<HTMLElement>('.draggable-mirror')!;

    expect(mirror.style).toMatchObject({
      width: `${smallerDraggableDimensions.width}px`,
      height: `${smallerDraggableDimensions.height}px`,
    });

    moveMouse(largerDraggable);
    waitForRequestAnimationFrame();
    waitForNextRequestAnimationFrame();

    expect(mirror.style).toMatchObject({
      width: `${largerDraggableDimensions.width}px`,
      height: `${largerDraggableDimensions.height}px`,
    });

    moveMouse(smallerDraggable);
    waitForRequestAnimationFrame();
    waitForNextRequestAnimationFrame();

    expect(mirror.style).toMatchObject({
      width: `${smallerDraggableDimensions.width}px`,
      height: `${smallerDraggableDimensions.height}px`,
    });

    releaseMouse(largerDraggable);
  });

  it('appends mirror in over container', async () => {
    clickMouse(smallerDraggable);
    waitForDragDelay();
    await waitForPromisesToResolve();

    const mirror = document.querySelector<HTMLElement>('.draggable-mirror')!;

    moveMouse(largerDraggable);
    waitForRequestAnimationFrame();

    expect(mirror.parentNode).toBe(containers[1]);

    releaseMouse(largerDraggable);
  });

  it('appends mirror only for different parent containers', async () => {
    clickMouse(smallerDraggable);
    waitForDragDelay();
    await waitForPromisesToResolve();

    const mirror = document.querySelector<HTMLElement>('.draggable-mirror')!;

    const mockedAppendChild = withMockedAppendChild(() => {
      moveMouse(smallerDraggable);
      waitForRequestAnimationFrame();
    });

    expect(mirror.parentNode).toBe(draggable.sourceContainer);
    expect(mockedAppendChild).not.toHaveBeenCalled();

    releaseMouse(largerDraggable);
  });

  it('dont appends mirror when mirror was removed', async () => {
    drag({from: smallerDraggable, to: smallerDraggable});
    drag({from: smallerDraggable, to: smallerDraggable});

    await waitForPromisesToResolve();
    waitForRequestAnimationFrame();

    const mirror = document.querySelector('.draggable-mirror');

    expect(mirror).toBeNull();
  });
});

function mockDimensions(element: HTMLElement, {width = 0, height = 0}) {
  Object.assign(element.style, {
    width: `${width}px`,
    height: `${height}px`,
  });

  const properties = {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
  };

  element.getBoundingClientRect = () => ({
    ...properties,
    toJSON() {
      return {...properties};
    },
  });

  return element;
}

function waitForNextRequestAnimationFrame() {
  waitForRequestAnimationFrame();
  waitForRequestAnimationFrame();
}

function withMockedAppendChild(callback: () => void) {
  const mock = jest.fn();
  const appendChild = Node.prototype.appendChild;
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  Node.prototype.appendChild = function (this: Node, ...args) {
    mock(...args);
    return appendChild.call(this, ...args);
  };
  /* eslint-enable @typescript-eslint/ban-ts-comment */
  callback();
  Node.prototype.appendChild = appendChild;
  return mock;
}
