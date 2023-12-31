import {
  createSandbox,
  triggerEvent,
  TestPlugin,
  clickMouse,
  moveMouse,
  releaseMouse,
  waitForDragDelay,
  waitForRequestAnimationFrame,
} from 'helper';

import Draggable, {defaultOptions} from '../Draggable';
import {
  DragStartEvent,
  DragMoveEvent,
  DragStopEvent,
  DragStoppedEvent,
} from '../DragEvent';
import {
  DraggableInitializedEvent,
  DraggableDestroyEvent,
} from '../DraggableEvent';
import {Focusable, Mirror, Scrollable, Announcement} from '../Plugins';
import {MouseSensor, TouchSensor} from '../Sensors';

const sampleMarkup = `
  <ul class="Container">
    <li>First item</li>
    <li>Second item</li>
  </ul>
  <ul class="DynamicContainer">
    <li>First item</li>
    <li>Second item</li>
  </ul>
`;

describe('Draggable', () => {
  let sandbox;
  let containers;
  const expectedClientX = 39;
  const expectedClientY = 82;

  beforeEach(() => {
    sandbox = createSandbox(sampleMarkup);
    containers = sandbox.querySelectorAll('.Container');
  });

  afterEach(() => {
    sandbox.remove();
  });

  describe('.Plugins', () => {
    it('should be available statically', () => {
      expect(Draggable.Plugins).toBeDefined();
      expect(Draggable.Plugins.Mirror).toStrictEqual(Mirror);
      expect(Draggable.Plugins.Focusable).toStrictEqual(Focusable);
      expect(Draggable.Plugins.Scrollable).toStrictEqual(Scrollable);
    });
  });

  describe('#constructor', () => {
    it('should be an instance of Draggable', () => {
      const draggable = new Draggable(containers, {
        draggable: 'li',
        delay: 0,
      });

      expect(draggable).toBeInstanceOf(Draggable);
    });

    it('should initialize with default options', () => {
      const newInstance = new Draggable(containers);

      Object.keys(defaultOptions).forEach((key) => {
        expect(newInstance.options[key]).toStrictEqual(defaultOptions[key]);
      });
    });

    /* eslint-disable jest/no-disabled-tests */
    it.skip('should set containers', () => {
      const newInstance = new Draggable(containers);

      expect(newInstance.containers).toMatchObject(
        Array.prototype.slice.call(containers),
      );
    });

    it.skip('should set single container if a list is not passed', () => {
      const newInstance = new Draggable(containers[0]);

      expect(newInstance.containers).toMatchObject([containers[0]]);
    });
    /* eslint-enable jest/no-disabled-tests */

    it('should throw error if `containers` argument is wrong type', () => {
      expect(() => {
        return new Draggable({});
      }).toThrow(
        'Draggable containers are expected to be of type `NodeList`, `HTMLElement[]` or `HTMLElement`',
      );

      expect(() => {
        return new Draggable('.li');
      }).toThrow(
        'Draggable containers are expected to be of type `NodeList`, `HTMLElement[]` or `HTMLElement`',
      );
    });

    it('should attach default plugins', () => {
      const newInstance = new Draggable();

      expect(newInstance.plugins).toHaveLength(4);

      expect(newInstance.plugins[0]).toBeInstanceOf(Announcement);

      expect(newInstance.plugins[1]).toBeInstanceOf(Focusable);

      expect(newInstance.plugins[2]).toBeInstanceOf(Mirror);

      expect(newInstance.plugins[3]).toBeInstanceOf(Scrollable);
    });

    it('should remove default plugins from the list of exclude plugins', () => {
      const newInstance = new Draggable([], {
        exclude: {
          plugins: [Draggable.Plugins.Focusable],
        },
      });

      expect(newInstance.plugins).toHaveLength(3);

      newInstance.plugins.forEach((plugin) => {
        expect(plugin).not.toBeInstanceOf(Focusable);
      });
    });

    it('should attach custom plugins', () => {
      const newInstance = new Draggable([], {
        plugins: [TestPlugin],
      });

      expect(newInstance.plugins).toHaveLength(5);

      const customPlugin = newInstance.plugins[4];

      expect(customPlugin.draggable).toBe(newInstance);

      expect(customPlugin.attach).toHaveBeenCalled();

      expect(customPlugin.detach).not.toHaveBeenCalled();
    });

    it('should attach sensors', () => {
      const newInstance = new Draggable([], {
        native: false,
      });

      expect(newInstance.sensors).toHaveLength(2);

      expect(newInstance.sensors[0]).toBeInstanceOf(MouseSensor);

      expect(newInstance.sensors[1]).toBeInstanceOf(TouchSensor);
    });

    it('should remove default sensors from the list of exclude sensors', () => {
      const newInstance = new Draggable([], {
        exclude: {
          sensors: [Draggable.Sensors.TouchSensor],
        },
      });

      expect(newInstance.sensors).toHaveLength(1);

      newInstance.sensors.forEach((sensor) => {
        expect(sensor).not.toBeInstanceOf(TouchSensor);
      });
    });

    it('should trigger DraggableInitializedEvent on init', () => {
      const spy = jest.spyOn(Draggable.prototype, 'trigger');
      const newInstance = new Draggable();

      expect(spy.mock.calls).toHaveLength(1);

      expect(spy.mock.calls[0][0]).toBeInstanceOf(DraggableInitializedEvent);

      expect(spy.mock.calls[0][0].draggable).toBe(newInstance);

      spy.mockReset();
      spy.mockRestore();
    });
  });

  describe('#destroy', () => {
    it('triggers `draggable:destroy` event on destroy', () => {
      const newInstance = new Draggable();
      const callback = jest.fn();

      newInstance.on('draggable:destroy', callback);

      newInstance.destroy();

      const call = callback.mock.calls[0][0];

      expect(call.type).toBe('draggable:destroy');

      expect(call).toBeInstanceOf(DraggableDestroyEvent);

      expect(call.draggable).toBe(newInstance);
    });

    it('should call Plugin#detach once on each of provided plugins', () => {
      const plugins = [TestPlugin, TestPlugin, TestPlugin];
      const newInstance = new Draggable([], {
        plugins,
      });
      const expectedPlugins = newInstance.plugins.slice();

      newInstance.destroy();

      expect(expectedPlugins[4].detach).toHaveBeenCalled();

      expect(expectedPlugins[4].detach).toHaveBeenCalledTimes(1);

      expect(expectedPlugins[5].detach).toHaveBeenCalled();

      expect(expectedPlugins[5].detach).toHaveBeenCalledTimes(1);

      expect(expectedPlugins[6].detach).toHaveBeenCalled();

      expect(expectedPlugins[6].detach).toHaveBeenCalledTimes(1);
    });

    it('should remove all sensor event listeners', () => {
      jest.spyOn(document, 'removeEventListener').mockImplementation();

      const newInstance = new Draggable();

      newInstance.destroy();

      const mockCalls = document.removeEventListener.mock.calls;

      expect(mockCalls[0][0]).toBe('drag:start');
      expect(mockCalls[1][0]).toBe('drag:move');
      expect(mockCalls[2][0]).toBe('drag:stop');
      expect(mockCalls[3][0]).toBe('drag:pressure');

      document.removeEventListener.mockRestore();
    });
  });

  describe('#on', () => {
    it('should add an event handler to the list of callbacks', () => {
      const newInstance = new Draggable();
      function stubHandler() {
        /* do nothing */
      }

      expect('my:event' in newInstance.emitter.callbacks).toBe(false);

      newInstance.on('my:event', stubHandler);

      expect('my:event' in newInstance.emitter.callbacks).toBe(true);

      expect(newInstance.emitter.callbacks['my:event']).toMatchObject([
        stubHandler,
      ]);
    });

    it('should return draggable instance', () => {
      const newInstance = new Draggable();
      function stubHandler() {
        /* do nothing */
      }

      expect('my:event' in newInstance.emitter.callbacks).toBe(false);

      const returnValue = newInstance.on('my:event', stubHandler);

      expect(returnValue).toBe(newInstance);
    });
  });

  describe('#off', () => {
    it('should remove event handler from the list of callbacks', () => {
      const newInstance = new Draggable();
      function stubHandler() {
        /* do nothing */
      }

      newInstance.on('my:event', stubHandler);

      expect('my:event' in newInstance.emitter.callbacks).toBe(true);

      newInstance.off('my:event', stubHandler);

      expect('my:event' in newInstance.emitter.callbacks).toBe(true);

      expect(newInstance.emitter.callbacks['my:event']).toMatchObject([]);
    });

    it('should return draggable instance', () => {
      const newInstance = new Draggable();
      function stubHandler() {
        /* do nothing */
      }

      newInstance.on('my:event', stubHandler);

      expect('my:event' in newInstance.emitter.callbacks).toBe(true);

      const returnValue = newInstance.off('my:event', stubHandler);

      expect(returnValue).toBe(newInstance);
    });
  });

  describe('#trigger', () => {
    it('should invoke bound event', () => {
      const newInstance = new Draggable(containers);
      const handler = jest.fn();
      const expectedEvent = new Event('my:event');

      newInstance.on('my:event', handler);

      newInstance.trigger(expectedEvent);

      expect(handler.mock.calls).toHaveLength(1);

      expect(handler.mock.calls[0]).toHaveLength(1);

      expect(handler.mock.calls[0][0]).toBe(expectedEvent);
    });
  });

  describe('#getDraggableElementsForContainer', () => {
    it('returns draggable elements, excluding mirror and original source', () => {
      const newInstance = new Draggable(containers, {
        draggable: 'li',
      });
      const draggableElement = sandbox.querySelector('li');

      triggerEvent(draggableElement, 'mousedown', {button: 0});

      // Wait for delay
      waitForDragDelay();

      const containerChildren = newInstance.getDraggableElementsForContainer(
        draggableElement.parentNode,
      );

      expect(containerChildren).toHaveLength(2);

      triggerEvent(draggableElement, 'mouseup', {button: 0});
    });
  });

  describe('#addContainer', () => {
    it('adds single container dynamically', () => {
      const dragOverContainerHandler = jest.fn();
      const newInstance = new Draggable(containers, {
        draggable: 'li',
      });

      newInstance.on('drag:over:container', dragOverContainerHandler);

      const draggableElement = document.querySelector('li');
      const dynamicContainer = document.querySelector('.DynamicContainer');

      clickMouse(draggableElement);
      waitForDragDelay();
      moveMouse(dynamicContainer);

      // will be called once after delay
      expect(dragOverContainerHandler).toHaveBeenCalledTimes(1);

      releaseMouse(newInstance.source);

      newInstance.addContainer(dynamicContainer);

      expect(newInstance.containers).toStrictEqual([
        ...containers,
        dynamicContainer,
      ]);

      clickMouse(draggableElement);
      waitForDragDelay();
      moveMouse(dynamicContainer);
      expect(dragOverContainerHandler).toHaveBeenCalledTimes(3);

      releaseMouse(newInstance.source);
    });
  });

  describe('#removeContainer', () => {
    it('removes single container dynamically', () => {
      let dragOverContainerHandler = jest.fn();
      const allContainers = document.querySelectorAll(
        '.Container, .DynamicContainer',
      );
      const newInstance = new Draggable(allContainers, {
        draggable: 'li',
      });

      newInstance.on('drag:over:container', dragOverContainerHandler);

      const draggableElement = document.querySelector('li');
      const dynamicContainer = document.querySelector('.DynamicContainer');

      clickMouse(draggableElement);
      waitForDragDelay();
      moveMouse(dynamicContainer);

      expect(dragOverContainerHandler).toHaveBeenCalledTimes(2);

      releaseMouse(newInstance.source);

      newInstance.removeContainer(dynamicContainer);

      expect(newInstance.containers).toStrictEqual([...containers]);

      dragOverContainerHandler = jest.fn();
      newInstance.on('drag:over:container', dragOverContainerHandler);

      clickMouse(draggableElement);
      waitForDragDelay();
      moveMouse(dynamicContainer);

      expect(dragOverContainerHandler).toHaveBeenCalledTimes(1);

      releaseMouse(newInstance.source);
    });
  });

  describe('#getDraggableElements', () => {
    it('returns draggable elements', () => {
      const draggable = new Draggable(containers, {
        draggable: 'li',
      });

      expect(draggable.getDraggableElements()).toStrictEqual([
        ...document.querySelectorAll('.Container li'),
      ]);
    });

    it('returns draggable elements after adding a container', () => {
      const dynamicContainer = document.querySelector('.DynamicContainer');
      const draggable = new Draggable(containers, {
        draggable: 'li',
      });

      expect(draggable.getDraggableElements()).toStrictEqual([
        ...document.querySelectorAll('.Container li'),
      ]);

      draggable.addContainer(dynamicContainer);

      expect(draggable.getDraggableElements()).toStrictEqual([
        ...document.querySelectorAll('li'),
      ]);

      draggable.removeContainer(dynamicContainer);

      expect(draggable.getDraggableElements()).toStrictEqual([
        ...document.querySelectorAll('.Container li'),
      ]);
    });
  });

  it('triggers `drag:move` as part of the `drag:start` event', () => {
    const dragStartHandler = jest.fn();
    const dragMoveHandler = jest.fn();

    let dragStartTarget;
    let dragMoveTarget;

    const draggable = new Draggable(containers, {
      draggable: 'li',
    });

    draggable.on('drag:start', (dragStartEvent) => {
      dragStartTarget = dragStartEvent.sensorEvent.target;
      dragStartHandler(dragStartEvent);
    });

    draggable.on('drag:move', (dragMoveEvent) => {
      dragMoveTarget = dragMoveEvent.sensorEvent.target;
      dragMoveHandler(dragMoveEvent);
    });

    const draggableElement = document.querySelector('li');

    clickMouse(draggableElement);
    waitForDragDelay();
    waitForRequestAnimationFrame();

    expect(dragStartHandler).toHaveBeenCalledTimes(1);
    expect(dragMoveHandler).toHaveBeenCalledTimes(1);

    expect(draggableElement).not.toStrictEqual(draggable.source);
    expect(dragStartTarget).toBe(draggableElement);
    expect(dragMoveTarget).toBe(draggable.source);

    releaseMouse(draggable.source);
  });

  it('triggers `drag:start` drag event on mousedown', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    const callback = jest.fn();
    newInstance.on('drag:start', callback);

    triggerEvent(draggableElement, 'mousedown', {button: 0});
    // Wait for delay
    waitForDragDelay();

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:start');

    expect(call).toBeInstanceOf(DragStartEvent);

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('should trigger `drag:start` drag event on dragstart', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    const callback = jest.fn();
    newInstance.on('drag:start', callback);

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(draggableElement, 'dragstart', {button: 0});

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:start');

    expect(call).toBeInstanceOf(DragStartEvent);

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('cleans up when `drag:start` event is canceled', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    let source;
    let originalSource;
    const callback = jest.fn((event) => {
      source = event.source;
      originalSource = event.originalSource;
      event.cancel();
    });

    newInstance.on('drag:start', callback);

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(draggableElement, 'dragstart', {button: 0});

    expect(newInstance.dragging).toBe(false);
    expect(source.parentNode).toBeNull();
    expect(originalSource.style.display).toBe('');
  });

  it('triggers `drag:move` drag event on mousedown', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const callback = jest.fn();
    newInstance.on('drag:move', callback);

    triggerEvent(document.body, 'mousemove', {
      clientX: expectedClientX,
      clientY: expectedClientY,
    });

    const call = callback.mock.calls[0][0];
    const sensorEvent = call.data.sensorEvent;

    expect(call.type).toBe('drag:move');

    expect(call).toBeInstanceOf(DragMoveEvent);

    expect(sensorEvent.clientX).toBe(expectedClientX);

    expect(sensorEvent.clientY).toBe(expectedClientY);

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('triggers `drag:stop` drag event on mouseup', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const callback = jest.fn();
    newInstance.on('drag:stop', callback);

    triggerEvent(draggableElement, 'mouseup', {button: 0});

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:stop');

    expect(call).toBeInstanceOf(DragStopEvent);
  });

  it('triggers `drag:stop` drag event on cancel', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });

    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const callback = jest.fn();
    newInstance.on('drag:stop', callback);

    newInstance.cancel();

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:stop');

    expect(call).toBeInstanceOf(DragStopEvent);
  });

  it('triggers `drag:stopped` drag event on mouseup', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const callback = jest.fn();
    newInstance.on('drag:stopped', callback);

    triggerEvent(draggableElement, 'mouseup', {button: 0});

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:stopped');

    expect(call).toBeInstanceOf(DragStoppedEvent);
  });

  it('triggers `drag:stopped` drag event on cancel', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const callback = jest.fn();
    newInstance.on('drag:stopped', callback);

    newInstance.cancel();

    const call = callback.mock.calls[0][0];

    expect(call.type).toBe('drag:stopped');

    expect(call).toBeInstanceOf(DragStoppedEvent);
  });

  it('adds `source:dragging` classname to draggable element on mousedown', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(newInstance.source.classList).toContain(
      'draggable-source--is-dragging',
    );

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('removes `source:dragging` classname from draggable element on mouseup', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const source = newInstance.source;

    expect(source.classList).toContain('draggable-source--is-dragging');

    triggerEvent(draggableElement, 'mouseup', {button: 0});

    expect(source.classList).not.toContain('draggable-source--is-dragging');
  });

  it('removes `source:dragging` classname from draggable element on dragEvent.cancel()', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    newInstance.on('drag:start', (event) => {
      event.cancel();
    });

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    const source = newInstance.source;

    expect(source.classList).not.toContain('draggable-source--is-dragging');

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('adds `body:dragging` classname to body on mousedown', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(document.body.classList).toContain('draggable--is-dragging');

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('removes `body:dragging` classname from body on mouseup', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();
    expect(document.body.classList).toContain('draggable--is-dragging');

    triggerEvent(document.body, 'mouseup', {button: 0});

    expect(document.body.classList).not.toContain('draggable--is-dragging');
  });

  it('removes `body:dragging` classname from body on dragEvent.cancel()', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    newInstance.on('drag:start', (event) => {
      event.cancel();
    });

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(document.body.classList).not.toContain('draggable--is-dragging');

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('adds `container:placed` classname to draggable container element on mouseup', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(draggableElement, 'mouseup', {button: 0});

    expect(containers[0].classList).toContain('draggable-container--placed');
  });

  it('removes `container:placed` classname from draggable container element on mouseup after delay', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(document.body, 'mouseup', {button: 0});

    expect(containers[0].classList).toContain('draggable-container--placed');

    // Wait for default draggable.options.placedTimeout delay
    jest.advanceTimersByTime(800);

    expect(containers[0].classList).not.toContain(
      'draggable-container--placed',
    );
  });

  it('adds `container:dragging` classname to draggable container element on mousedown', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(containers[0].classList).toContain(
      'draggable-container--is-dragging',
    );

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('removes `container:dragging` classname from draggable container element on mouseup', () => {
    (() =>
      new Draggable(containers, {
        draggable: 'li',
      }))();
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(containers[0].classList).toContain(
      'draggable-container--is-dragging',
    );

    triggerEvent(document.body, 'mouseup', {button: 0});

    expect(containers[0].classList).not.toContain(
      'draggable-container--is-dragging',
    );
  });

  it('removes `container:dragging` classname from draggable container element on dragEvent.cancel()', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');

    newInstance.on('drag:start', (event) => {
      event.cancel();
    });

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(containers[0].classList).not.toContain(
      'draggable-container--is-dragging',
    );

    triggerEvent(draggableElement, 'mouseup', {button: 0});
  });

  it('adds and removes `source:original` on start and stop', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(
      draggableElement.classList.contains(
        newInstance.getClassNameFor('source:original'),
      ),
    ).toBe(true);

    triggerEvent(document.body, 'mouseup', {button: 0});

    expect(
      draggableElement.classList.contains(
        newInstance.getClassNameFor('source:original'),
      ),
    ).toBe(false);
  });

  it('should have multiple classes for `source:original` on start', () => {
    const sourceOriginalClasses = ['draggable--original', 'class1', 'class2'];
    const newInstance = new Draggable(containers, {
      draggable: 'li',
      classes: {
        'source:original': sourceOriginalClasses,
      },
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(newInstance.getClassNamesFor('source:original')).toStrictEqual(
      sourceOriginalClasses,
    );

    triggerEvent(document.body, 'mouseup', {button: 0});
  });

  it('should removes all draggable classes for `source:original` on stop', () => {
    const sourceOriginalClasses = ['draggable--original', 'class1', 'class2'];
    const newInstance = new Draggable(containers, {
      draggable: 'li',
      classes: {
        'source:original': sourceOriginalClasses,
      },
    });
    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(document.body, 'mouseup', {button: 0});

    newInstance.getClassNamesFor('source:original').forEach((className) => {
      expect(draggableElement.classList).not.toContain(className);
    });
  });

  it('`drag:out:container` event specifies leaving container', () => {
    const newInstance = new Draggable(containers, {
      draggable: 'li',
    });

    newInstance.on('drag:over:container', (dragEvent) => {
      expect(dragEvent.overContainer).toStrictEqual(containers[0]);
    });

    newInstance.on('drag:out:container', (dragEvent) => {
      expect(dragEvent.overContainer).toStrictEqual(containers[0]);
    });

    const draggableElement = sandbox.querySelector('li');
    document.elementFromPoint = () => draggableElement;

    triggerEvent(draggableElement, 'mousedown', {button: 0});

    // Wait for delay
    waitForDragDelay();

    expect(newInstance.isDragging()).toBe(true);

    document.elementFromPoint = () => draggableElement.nextElementSibling;
    triggerEvent(draggableElement.nextElementSibling, 'mousemove', {button: 0});

    // Wait for delay
    waitForDragDelay();

    document.elementFromPoint = () => document.body;
    triggerEvent(document.body, 'mousemove', {button: 0});

    // Wait for delay
    waitForDragDelay();

    triggerEvent(document.body, 'mouseup', {button: 0});
  });

  describe('when `drag:stopped`', () => {
    it('source element was removed from document', () => {
      const newInstance = new Draggable(containers, {
        draggable: 'li',
      });
      const draggableElement = sandbox.querySelector('li');
      document.elementFromPoint = () => draggableElement;

      newInstance.on('drag:stopped', (event) => {
        expect(event.source.parentNode).toBeNull();
      });

      clickMouse(draggableElement);

      // Wait for delay
      waitForDragDelay();

      releaseMouse(newInstance.source);
    });
  });

  describe('when `drag:out`', () => {
    it('should trigger dragOutEvent', () => {
      const newInstance = new Draggable(containers, {
        draggable: 'li',
      });
      const draggableElement = sandbox.querySelector('li');
      document.elementFromPoint = () => draggableElement;

      newInstance.on('drag:out', (event) => {
        expect(event.overContainer).toBe(containers[0]);
      });

      clickMouse(draggableElement);

      waitForDragDelay();

      document.elementFromPoint = () => draggableElement.nextElementSibling;
      moveMouse(draggableElement.nextElementSibling);

      waitForDragDelay();

      releaseMouse(newInstance.source);
    });
  });
});
