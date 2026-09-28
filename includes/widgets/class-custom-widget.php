<?php

use Elementor\Widget_Base;
use Elementor\Controls_Manager;

if (! defined('ABSPATH')) exit;

class My_Custom_Widget extends Widget_Base {
    public function get_name() {
        return 'zambales_map';
    }

    public function get_title() {
        return __('Zambales Map', 'my-elementor-extension');
    }

    public function get_icon() {
        return 'eicon-code';
    }

    public function get_categories() {
        return ['custom-widget'];
    }

    protected function register_controls() {
        $this->start_controls_section(
            'content_section',
            ['label' => __('Content', 'my-elementor-extension')]
        );

        $this->add_control(
            'height',
            [
                'label' => __('Height (px)', 'my-elementor-extension'),
                'type' => Controls_Manager::NUMBER,
                'default' => 500,
            ]
        );
        $this->add_control(
            'zoomLevel',
            [
                'label' => __('Zoom level', 'my-elementor-extension'),
                'type' => Controls_Manager::NUMBER,
                'default' => 9,
            ]
        );
        $this->add_control(
            'mapColor',
            [
                'label' => __('Map Color', 'my-elementor-extension'),
                'type' => Controls_Manager::COLOR,
                'default' => '#573CAF55',
            ]
        );
        $this->add_control(
            'mapBorderColor',
            [
                'label' => __('Map Border Color', 'my-elementor-extension'),
                'type' => Controls_Manager::COLOR,
                'default' => '#573CAF',
            ]
        );
        $this->add_control(
            'borderWeight',
            [
                'label' => __('Border Width', 'my-elementor-extension'),
                'type' => Controls_Manager::NUMBER,
                'default' => 3,
            ]
        );
        $this->add_control(
            'hoverColor',
            [
                'label' => __('Hover Color', 'my-elementor-extension'),
                'type' => Controls_Manager::COLOR,
                'default' => '#573CAF',
            ]
        );
        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();

        $data = wp_json_encode([
            'height' => $settings['height'],
            'zoomLevel' => $settings['zoomLevel'],
            'mapColor' => $settings['mapColor'],
            'mapBorderColor' => $settings['mapBorderColor'],
            'hoverColor' => $settings['hoverColor'],
            'borderWeight' => $settings['borderWeight'],
        ]);

        echo '<div id="ifl_zambales_map" data-settings=\'' . esc_attr($data) . '\'></div>';
    }
}
