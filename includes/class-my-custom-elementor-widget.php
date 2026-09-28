<?php
if (!defined("ABSPATH")) {
  exit();
}

class My_Elementor_Extension
{
  public function __construct()
  {
    // Load widgets after Elementor is loaded
    add_action("elementor/widgets/register", [$this, "register_widgets"]);

    // Add a new widget category (optional)
    add_action("elementor/elements/categories_registered", [
      $this,
      "add_widget_categories",
    ]);

    // ✅ Enqueue React JS bundle
    add_action("wp_enqueue_scripts", [$this, "enqueue_assets"]);

    // ✅ Also enqueue scripts inside Elementor editor (so it renders live)
    add_action("elementor/editor/after_enqueue_scripts", [
      $this,
      "enqueue_assets",
    ]);
  }

  public function register_widgets($widgets_manager)
  {
    require_once __DIR__ . "/widgets/class-custom-widget.php";
    $widgets_manager->register(new \My_Custom_Widget());
  }

  public function add_widget_categories($elements_manager)
  {
    $elements_manager->add_category("custom-widget", [
      "title" => __("Custom Widget", "my-elementor-extension"),
      "icon" => "fa fa-plug",
    ]);
  }

  public function enqueue_assets()
  {
    // ✅ Use __DIR__ safely and fix path resolution
    wp_enqueue_script(
      "my-react-widget-js",
      plugins_url("assets/main.js", dirname(__FILE__)), // fixed path
      [],
      "1.0.0",
      true,
    );

    // Optional: enqueue CSS too if needed
    // wp_enqueue_style(
    //     'my-react-widget-css',
    //     plugins_url('assets/main.css', dirname(__FILE__)),
    //     [],
    //     '1.0.0'
    // );
  }
}

new My_Elementor_Extension();
