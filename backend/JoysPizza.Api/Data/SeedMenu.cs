using JoysPizza.Api.Domain;

namespace JoysPizza.Api.Data;

/// <summary>The starting menu. Inserted once when the menu table is empty (and by "Reset to sample menu").</summary>
public static class SeedMenu
{
    private static string Img(string id) =>
        $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=800&q=75";

    // Two pizza sizes. "price" passed to Item() is the Medium price; Large is +$5 (placeholder prices).
    // Labels must start with "Medium" / "Large" — the Buy 2 Large, Get 1 Medium deal matches on that.
    public const string MediumLabel = "Medium 14\" · 8 slices";
    public const string LargeLabel = "Large 16\" · 16 slices";

    private static List<MenuItemSize> PizzaSizes(decimal medium) =>
    [
        new() { Label = MediumLabel, Price = medium },
        new() { Label = LargeLabel, Price = medium + 5m },
    ];

    private static MenuItem Item(
        string id, string name, string description, decimal price, MenuCategory category, string image,
        string[]? tags = null, bool special = false, bool sizes = false) => new()
    {
        Id = id,
        Name = name,
        Description = description,
        Price = price,
        Category = category,
        ImageUrl = Img(image),
        Tags = tags?.ToList() ?? [],
        IsSpecial = special,
        IsAvailable = true,
        Sizes = sizes ? PizzaSizes(price) : [],
    };

    public static List<MenuItem> Build()
    {
        var items = new List<MenuItem>
        {
            // Pizza
            Item("pz-cheese", "Cheese Pizza", "Classic cheese pizza with tomato sauce and mozzarella. Deal: Buy 2 Large, get 1 Medium FREE!", 14.99m, MenuCategory.Pizza, "1513104890138-7c749659a591", ["Deal"], special: true, sizes: true),
            Item("pz-margherita", "Classic Margherita", "San Marzano tomato, fresh mozzarella, basil, extra-virgin olive oil.", 13.99m, MenuCategory.Pizza, "1574071318508-1cdbab80d002", ["Vegetarian"], special: true, sizes: true),
            Item("pz-pepperoni", "Double Pepperoni", "Two layers of cup-and-char pepperoni, mozzarella, hot honey drizzle.", 15.99m, MenuCategory.Pizza, "1628840042765-356cda07504e", ["Best seller"], special: true, sizes: true),
            Item("pz-bbq-chicken", "BBQ Chicken", "Smoky BBQ sauce, grilled chicken, red onion, cilantro, smoked gouda.", 16.99m, MenuCategory.Pizza, "1565299624946-b28f40a0ae38", sizes: true),
            Item("pz-supreme", "The Supreme", "Pepperoni, Italian sausage, bell peppers, onions, mushrooms, black olives.", 17.99m, MenuCategory.Pizza, "1513104890138-7c749659a591", special: true, sizes: true),
            Item("pz-veggie", "Garden Veggie", "Roasted peppers, spinach, artichoke, cherry tomato, feta, pesto swirl.", 15.49m, MenuCategory.Pizza, "1571997478779-2adcbbe9ab2f", ["Vegetarian"], sizes: true),
            Item("pz-meat", "Meat Lovers", "Pepperoni, sausage, bacon, ham and meatball on a garlic-butter crust.", 18.49m, MenuCategory.Pizza, "1594007654729-407eedc4be65", sizes: true),

            // Pasta
            Item("pa-alfredo", "Chicken Fettuccine Alfredo", "Parmesan cream sauce, grilled chicken, cracked black pepper.", 16.49m, MenuCategory.Pasta, "1645112411341-6c4fd023714a"),
            Item("pa-bolognese", "Spaghetti Bolognese", "Slow-simmered beef & pork ragù, parmigiano, torn basil.", 15.99m, MenuCategory.Pasta, "1551183053-bf91a1d81141", special: true),
            Item("pa-penne-vodka", "Penne alla Vodka", "Creamy tomato-vodka sauce, chili flakes, pecorino.", 14.99m, MenuCategory.Pasta, "1621996346565-e3dbc646d9a9", ["Vegetarian"]),
            Item("pa-lasagna", "Baked Lasagna", "Layers of ricotta, mozzarella and meat sauce, baked to order.", 17.49m, MenuCategory.Pasta, "1574894709920-11b28e7367e3"),

            // Burgers
            Item("bg-classic", "Classic Smash Burger", "Two smashed patties, American cheese, pickles, house sauce. Served with fries.", 13.49m, MenuCategory.Burgers, "1568901346375-23c9450c58cd", special: true),
            Item("bg-bacon", "Bacon BBQ Burger", "Angus beef, cheddar, thick-cut bacon, onion rings, BBQ sauce.", 15.49m, MenuCategory.Burgers, "1553979459-d2229ba7433b"),
            Item("bg-mushroom", "Mushroom Swiss", "Sautéed mushrooms, Swiss cheese, caramelized onion, garlic aioli.", 14.49m, MenuCategory.Burgers, "1550547660-d9450f859349"),
            Item("bg-veggie", "Beyond Veggie Burger", "Plant-based patty, lettuce, tomato, avocado, chipotle mayo.", 14.99m, MenuCategory.Burgers, "1520072959219-c595dc870360", ["Vegetarian"]),

            // Appetizers
            Item("ap-wings", "Buffalo Wings (10 pc)", "Crispy wings tossed in buffalo sauce, with celery & blue cheese.", 12.99m, MenuCategory.Appetizers, "1527477396000-e27163b481c2", ["Spicy"], special: true),
            Item("ap-garlic-knots", "Garlic Knots", "Six knots brushed with garlic butter & parmesan, marinara for dipping.", 6.99m, MenuCategory.Appetizers, "1619531040576-f9416740661d", ["Vegetarian"]),
            Item("ap-mozz-sticks", "Mozzarella Sticks", "Golden, stretchy and served with warm marinara.", 8.99m, MenuCategory.Appetizers, "1531749668029-2db88e4276c7", ["Vegetarian"]),
            Item("ap-fries", "Loaded Fries", "Cheddar sauce, bacon bits, scallions, sour cream.", 8.49m, MenuCategory.Appetizers, "1573080496219-bb080dd4f877"),

            // Salads
            Item("sl-caesar", "Caesar Salad", "Romaine, parmesan, garlic croutons, house Caesar dressing. Add chicken +$4.", 10.99m, MenuCategory.Salads, "1550304943-4f24f54ddde9"),
            Item("sl-greek", "Greek Salad", "Cucumber, tomato, kalamata olives, red onion, feta, oregano vinaigrette.", 11.49m, MenuCategory.Salads, "1540420773420-3366772f4999", ["Vegetarian"]),
            Item("sl-caprese", "Caprese Salad", "Heirloom tomato, fresh mozzarella, basil, balsamic glaze.", 11.99m, MenuCategory.Salads, "1512621776951-a57141f2eefd", ["Vegetarian", "Gluten-free"]),

            // Desserts
            Item("ds-tiramisu", "Tiramisu", "Espresso-soaked ladyfingers, mascarpone cream, cocoa.", 7.99m, MenuCategory.Desserts, "1571877227200-a0d98ea607e9", special: true),
            Item("ds-cheesecake", "NY Cheesecake", "Classic New York style with strawberry compote.", 7.49m, MenuCategory.Desserts, "1533134242443-d4fd215305ad"),
            Item("ds-brownie", "Brownie Sundae", "Warm fudge brownie, vanilla ice cream, chocolate sauce.", 8.49m, MenuCategory.Desserts, "1563805042-7684c019e1cb"),
            Item("ds-cannoli", "Cannoli (2 pc)", "Crisp shells filled with sweet ricotta & chocolate chips.", 6.49m, MenuCategory.Desserts, "1551024601-bec78aea704b"),

            // Drinks
            Item("dr-soda", "Fountain Soda", "Coke, Diet Coke, Sprite or Dr Pepper — 20 oz.", 2.99m, MenuCategory.Drinks, "1622483767028-3f66f32aef97"),
            Item("dr-lemonade", "Fresh Lemonade", "Squeezed daily. Try it strawberry for +$1.", 3.99m, MenuCategory.Drinks, "1621263764928-df1444c5e859"),
            Item("dr-tea", "Iced Tea", "Sweet or unsweetened, brewed in house.", 2.99m, MenuCategory.Drinks, "1556679343-c7306c1976bc"),
            Item("dr-shake", "Milkshake", "Vanilla, chocolate or strawberry, topped with whipped cream.", 5.99m, MenuCategory.Drinks, "1572490122747-3968b75cc699"),
        };

        for (var i = 0; i < items.Count; i++) items[i].SortOrder = i;
        return items;
    }
}
