'use client';

import React, { useMemo } from 'react';
import '@wix/ricos/css/all-plugins-viewer.css';
import { quickStartViewerPlugins, RicosViewer } from '@wix/ricos';
import { wixEventsV2 as wixEvents } from '@wix/events';
import type { ReactNode, ReactElement } from 'react';
import type { ViewerPlugin } from '@wix/ricos';

interface EventRichTextProps {
  richText?: wixEvents.RichContent | null;
  title?: React.ReactNode;
}

const IMAGE_PLUGIN_TYPE = 'wix-draft-plugin-image';

const sanitizeFetchPriority = (node: ReactNode): ReactNode => {
  if (!React.isValidElement(node)) {
    return node;
  }

  const element = node as ReactElement<{
    children?: ReactNode;
    fetchpriority?: string;
  }>;

  const { children, fetchpriority, ...restProps } = element.props;
  const sanitizedChildren =
    children === undefined
      ? undefined
      : React.Children.map(children, sanitizeFetchPriority);
  const hasFetchPriority = fetchpriority !== undefined;

  if (!hasFetchPriority && sanitizedChildren === children) {
    return element;
  }

  const nextProps: Record<string, unknown> = { ...restProps };
  if (hasFetchPriority) {
    nextProps.fetchPriority = fetchpriority;
  }

  return React.cloneElement(
    element,
    nextProps,
    sanitizedChildren as React.ReactNode
  );
};

const patchImagePlugin = <PluginConfig,>(
  plugin: ViewerPlugin<PluginConfig>
): ViewerPlugin<PluginConfig> => {
  if (
    plugin.type !== IMAGE_PLUGIN_TYPE ||
    !plugin.nodeViewRenderers ||
    !plugin.nodeViewRenderers.IMAGE
  ) {
    return plugin;
  }

  const originalRenderer = plugin.nodeViewRenderers.IMAGE;
  // eslint-disable-next-line prettier/prettier
  const patchedRenderer:
    typeof originalRenderer = (props) => {
    const rendered = originalRenderer(props);
    // eslint-disable-next-line prettier/prettier
    return sanitizeFetchPriority(rendered) as ReturnType<typeof originalRenderer>;
  };

  return {
    ...plugin,
    nodeViewRenderers: {
      ...plugin.nodeViewRenderers,
      IMAGE: patchedRenderer,
    },
  };
};

const EventRichText = ({ richText, title }: EventRichTextProps) => {
  const plugins = useMemo(() => {
    return quickStartViewerPlugins().map((plugin) =>
      plugin.type === IMAGE_PLUGIN_TYPE ? patchImagePlugin(plugin) : plugin
    );
  }, []);

  if (!richText) {
    return null;
  }

  return (
    <>
      {title && <>{title}</>}
      <RicosViewer plugins={plugins} content={richText as any} />
    </>
  );
};

export default EventRichText;
