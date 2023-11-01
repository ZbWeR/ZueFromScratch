import { VNode, Container, ComponentOptions, ComponentInstance } from "types/renderer";

class VNodeImpl implements VNode {
  type: string | symbol | ComponentOptions = "";
  children: string | VNode[] | null = null;
  props?: Record<string | symbol, any>;
  el?: Container;
  _if?: boolean;

  key?: any;
  component?: ComponentInstance;
}

class VNodeBuilder {
  private type: string | symbol | ComponentOptions = "";
  private children: string | VNode[] | null = null;
  private props?: Record<string | symbol, any>;
  private el?: Container;
  private _if?: boolean;
  private key?: any;
  private component?: ComponentInstance;

  public setTye(type: string | symbol | ComponentOptions): VNodeBuilder {
    this.type = type;
    return this;
  }

  public setChildren(children: string | VNode[] | null): VNodeBuilder {
    this.children = children;
    return this;
  }

  public setProps(props: Record<string | symbol, any>): VNodeBuilder {
    this.props = props;
    return this;
  }

  public setEl(el: Container): VNodeBuilder {
    this.el = el;
    return this;
  }

  public setKey(key: any): VNodeBuilder {
    this.key = key;
    return this;
  }

  public setComponent(component: ComponentInstance): VNodeBuilder {
    this.component = component;
    return this;
  }

  public setIf(ifValue: boolean): VNodeBuilder {
    this._if = ifValue;
    return this;
  }

  public build(): VNode {
    const vnode = new VNodeImpl();
    Object.keys(this).forEach((key) => ((vnode as any)[key] = (this as any)[key]));
    return vnode;
  }
}

export class VNodeUtil {
  static builder(): VNodeBuilder {
    return new VNodeBuilder();
  }
}

export const Text: symbol = Symbol();
export const Comment: symbol = Symbol();
export const Fragment: symbol = Symbol();
