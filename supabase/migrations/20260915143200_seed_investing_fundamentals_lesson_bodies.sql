-- Seed lesson body HTML for "Investing Fundamentals" course
-- Updates lessons by title and course slug (no hardcoded UUIDs)

-- Lesson 1
UPDATE lessons
SET body = $$<h1><strong>Tax Lien Certificates &amp; Tax Deeds: Safe, Predictable Investing</strong></h1>
<h2><strong>Meet the Team &amp; Community:</strong></h2>
<p>Join the instructor and his expert team—including seasoned coaches like the veteran coach and the investor-coach team—who have helped thousands safely invest in tax lien certificates and tax deeds. With decades of experience and live support through weekly Q&amp;A webinars, one-on-one coaching, and facilitator-led Zoom calls, you'll have guidance every step of the way.</p>
<h2><strong>Why Tax Liens?</strong></h2>
<p>Tax lien certificates offer a government-backed, low-risk way to earn high, legally mandated interest rates—often 16% to 24%—by paying off delinquent property taxes. Most certificates are redeemed, so you get your investment back plus interest; in rare cases, you may acquire the property, often mortgage-free and for a fraction of its value.</p>
<h2><strong>How It Works:</strong></h2>
<ul><li><p>Local governments sell tax lien certificates at public auctions (now mostly online) to recover unpaid property taxes.</p></li><li><p>You invest directly with the government—no middlemen or commissions.</p></li><li><p>High-paying states include Florida (up to 18%), Arizona (16%), Illinois (18%), Georgia (up to 50% penalty), Iowa (24%), and Texas (25% penalty in six months).</p></li></ul>
<h2><strong>Strategies &amp; Real Results:</strong></h2>
<ul><li><p>Conservative investors like the veteran coach target quality properties likely to redeem, ensuring steady, passive returns.</p></li><li><p>Others, like the investor-coach team, seek properties unlikely to redeem, aiming to acquire and resell them for substantial profits—including turning a $11,000 certificate into a $180,000 property.</p></li><li><p>Both approaches require thorough research and due diligence to avoid costly mistakes.</p></li></ul>
<h2><strong>Getting Started:</strong></h2>
<ul><li><p>All research, bidding, and purchases can be done online, making this accessible from anywhere—even for beginners.</p></li><li><p>Most investors start with just a few hundred dollars.</p></li><li><p>With the instructor's proven system, many students consistently earn five- and six-figure annual profits.</p></li></ul>
<p></p>
<h2><strong>Ready to Learn More?</strong></h2>
<p>Explore America's 200-year-old, government-backed tax lien and tax deed system. Attend live workshops, access online resources, and discover how you can build wealth securely and predictably from home.</p>$$
WHERE title = 'Lesson 1'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 2
UPDATE lessons
SET body = $$<h1>Lesson 2 Summary: Investing in Tax Deeds</h1>
<h2><strong>What Is a Tax Deed?</strong></h2>
<p>When property owners stop paying their taxes, local governments need a way to recover that money. About half of U.S. states do this by selling the property itself at a public auction. The sale starts at the amount of back taxes owed, which means buyers can often pick up properties for a fraction of their market value.</p>
<h2><strong>How the Auctions Work</strong></h2>
<p>Tax deed auctions are open to the public. Some are held in person at county offices, others are fully online. Rules vary by state and county, but the basics are simple: register to bid, do your research, and be ready to pay if you win. Most states hold auctions once a year, though some states like Florida and Georgia hold them more frequently.</p>
<h2><strong>Research Is Everything</strong></h2>
<p>Before bidding on any property, you need to know its value, its condition, and any liens attached to it. Tools like Zillow, Redfin, and Realtor.com are a good starting point, but local real estate agents can fill in the gaps. Viewing the property in person (or having someone do it for you) helps you spot costly repairs and adjust your maximum bid accordingly.</p>
<h2><strong>A Real Student's First Deal</strong></h2>
<p>The student investor followed the instructor's training step by step. After attending auctions in California and Arkansas without winning, he joined a buying tour in Michigan and landed his first property for $52,750. The market value was $150,000, giving him strong profit potential from the start.</p>
<h2><strong>Selling the Property</strong></h2>
<p>The student investor first tried selling on his own with an open house. He accepted a $120,000 cash offer, but the deal fell through after the buyer couldn't pay. He learned three hard lessons: always ask for proof of funds, never waive the deposit, and never let a buyer move in before closing. He eventually listed with a local agent, made some basic repairs, and sold the home for $161,000.</p>
<h2><strong>Start Small, Then Scale</strong></h2>
<p>The veteran coach bought his first tax deed property for $2,400 and quickly sold it for $6,000. Starting small is a smart way to learn the process without taking on too much risk. As your confidence grows, you can move into higher-value properties where the profit potential is much larger.</p>
<h2><strong>The Bigger Picture</strong></h2>
<p>The physician investor used other people's money to invest in tax deeds and generated around $5 million in profits over five years in California alone. The key takeaway from all these stories is consistent: learn the process, do the research, get guidance, and take action. A coach can make the difference between spinning your wheels and closing deals.</p>$$
WHERE title = 'Lesson 2'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 3
UPDATE lessons
SET body = $$<h1><strong>Tax Lien &amp; Tax Deed Investing: Strategies and Success with the investor-coach team</strong></h1>
<p>This video centers on the real-world strategies and experiences of coaches the investor-coach team, who share their journey from skeptical newcomers to highly successful investors in tax lien certificates and tax deeds13.</p>
<h2><strong>The investor-coach team's Approach</strong></h2>
<p>The investor-coach team began their investing journey after learning the instructor's system, initially drawn by the flexibility and potential for significant profits. They highlight the importance of partnership, dividing responsibilities based on each other's strengths, and how tax lien and deed investing allowed them to build wealth while raising a family and working from anywhere.</p>
<h2><strong>Two Distinct Investment Strategies</strong></h2>
<ul><li><p><strong>Conservative Approach:</strong> The veteran coach prefers high-quality properties likely to redeem, ensuring steady, predictable returns. He focuses on properties with a high probability of the owner paying back taxes, minimizing risk and rarely ending up with the property itself.</p></li><li><p><strong>Aggressive Approach:</strong> the investor-coach team deliberately seek out "don't wanter" properties—those less likely to redeem—such as vacant land, inherited properties, or distressed homes. Their goal is to acquire the property through the tax lien or deed process, often for pennies on the dollar, and then resell or rent for substantial profits.</p></li></ul>
<h2><strong>The investor-coach team's Success Stories</strong></h2>
<ul><li><p>Their first major deal involved purchasing a tax lien certificate for $1,000 on a pristine condo valued at $180,000. After the redemption period passed and the owner did not pay, they foreclosed, gained ownership, rented it out, and ultimately sold it—netting over $170,000 in profit.</p></li><li><p>In another deal, they acquired a property in Eloy, Arizona, for a few thousand dollars in back taxes. After legal proceedings and some hands-on work, they sold the property for a significant gain, demonstrating their repeatable, research-driven process.</p></li></ul>
<h2><strong>Key Lessons &amp; Best Practices</strong></h2>
<ul><li><p><strong>Thorough Research:</strong> the investor-coach team stress the need to research not just the property, but also the owner's situation (out-of-state owners, deceased, abandoned, etc.) to maximize the chance of acquiring the property.</p></li><li><p><strong>On-the-Ground Verification:</strong> They recommend having someone physically inspect properties, even if investing remotely, to avoid surprises.</p></li><li><p><strong>Leverage Experts:</strong> For legal processes like foreclosure, they advise hiring professionals to ensure everything is handled correctly.</p></li><li><p><strong>Coaching &amp; Community:</strong> Both attribute much of their success to ongoing support from the instructor's coaching network, which provided guidance, accountability, and answers to complex questions throughout their deals.</p></li></ul>
<h2><strong>Student Successes &amp; Broader Impact</strong></h2>
<p>The video also features stories from students like the student investor, who—with coaching from the investor-coach team—progressed from no real estate experience to successfully acquiring and selling tax deed properties for substantial profits. The importance of mentorship, perseverance, and learning from others' experiences is a recurring theme.</p>
<h2><strong>Summary</strong></h2>
<p>The investor-coach team exemplify how focused strategy, diligent research, and leveraging a supportive community can turn tax lien and tax deed investing into a reliable, scalable path to wealth. Their hands-on stories provide a blueprint for both new and experienced investors looking to achieve similar results in this unique real estate niche.</p>$$
WHERE title = 'Lesson 3'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 4
UPDATE lessons
SET body = $$<h1><strong>Tax Lien Certificates &amp; Tax Deeds: Strategies, Student Success, and the featured investor's Journey</strong></h1>
<p>This video offers a comprehensive look at tax lien certificate and tax deed investing, featuring the instructor, his coaching team, and an in-depth interview with investor the featured investor.</p>
<h2><strong>The featured investor's Experience</strong></h2>
<p>Nearly half the video is dedicated to the featured investor's candid interview, where she shares her journey from initial skepticism to becoming a successful tax deed investor. She describes how she started with little background, gained confidence through the instructor's training and community, and ultimately found a reliable way to provide for her family. Her story highlights the importance of mentorship, perseverance, and learning from both successes and setbacks.</p>
<h2><strong>Tax Lien &amp; Tax Deed Strategies</strong></h2>
<p>The instructor and his coaches, including the veteran coach, another coach, and the investor-coach team, discuss two main approaches:</p>
<ul><li><p>Conservative investors, like the veteran coach, focus on high-quality properties likely to redeem, ensuring steady, passive returns.</p></li><li><p>Others, like another coach and the investor-coach team, target properties less likely to redeem, aiming to acquire and resell them for significant profits—sometimes turning a $1,000 investment into a property worth $180,000.</p></li></ul>
<h2><strong>Key Lessons and Best Practices</strong></h2>
<ul><li><p>Research is critical: always investigate property value, condition, and local rules before bidding.</p></li><li><p>Auctions are increasingly online, making participation accessible from anywhere.</p></li><li><p>Students and coaches share real-world examples, emphasizing both the profit potential and the importance of avoiding common pitfalls.</p></li></ul>
<h2><strong>Summary</strong></h2>
<p>With insights from the instructor's team and the featured investor's real-life experience, the video demonstrates that—with the right education and support—tax lien and tax deed investing can offer a secure, flexible, and profitable path to wealth, whether you seek predictable returns or major gains through property acquisition and resale.</p>$$
WHERE title = 'Lesson 4'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 5
UPDATE lessons
SET body = $$<h1><strong>Tax Lien Certificates &amp; Tax Deeds: Fundamentals, Strategies, and the seasoned coach's Journey</strong></h1>
<p>This video delivers a thorough overview of the fundamentals and strategies behind tax lien certificate and tax deed investing, with a special focus on the real-world experience of investor the seasoned coach.</p>
<h2><strong>How Tax Liens and Tax Deeds Work</strong></h2>
<p>The instructor and his team outline how tax lien certificates allow investors to pay off someone else's delinquent property taxes in exchange for high, government-guaranteed interest rates—often 8% to 24%. If the taxes are paid, the investor receives their principal plus interest; if not, they may acquire the property, often mortgage-free and at a steep discount. Tax deeds, by contrast, involve bidding at public auctions to acquire full ownership of tax-defaulted properties, frequently for just the back taxes owed.</p>
<h2><strong>The seasoned coach's Investor Story</strong></h2>
<p>A significant portion of the video is devoted to an in-depth interview with the seasoned coach. The seasoned coach shares how he started with little background in real estate, gained confidence through the instructor's training, and successfully navigated the process of researching, bidding, and acquiring properties at auction. He discusses his initial skepticism, the importance of mentorship, and the practical steps he took to avoid costly mistakes. The seasoned coach's journey highlights how accessible this investment strategy can be, even for those new to the field, and underscores the value of community support and hands-on learning.</p>
<h2><strong>Expert Strategies and Student Successes</strong></h2>
<p>The instructor and his coaches—including the veteran coach, another coach, and the investor-coach team—contrast conservative strategies (targeting high-quality properties likely to redeem for steady returns) with more aggressive approaches (seeking properties less likely to redeem for the chance to acquire and resell at a profit). Real-world examples illustrate both paths, including turning small investments into substantial gains.</p>
<h2><strong>Best Practices and Key Takeaways</strong></h2>
<ul><li><p>Diligent research and property inspection are essential before bidding.</p></li><li><p>Understand each state and county's auction rules.</p></li><li><p>Start small to build confidence, then scale up.</p></li><li><p>Leverage coaching, workshops, and community resources for support and guidance.</p></li></ul>
<h2><strong>Summary</strong></h2>
<p>Through the seasoned coach's personal account and expert insights from the instructor's team, this video demonstrates how tax lien and tax deed investing can offer a secure, flexible, and profitable path to building wealth—whether you're seeking predictable returns or major gains through property acquisition and resale.</p>$$
WHERE title = 'Lesson 5'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 6
UPDATE lessons
SET body = $$<h1><strong>Tax Lien &amp; Tax Deed Investing: New and Experienced Investors</strong></h1>
<p>This video highlights the journeys and insights of three key participants in the instructor's tax lien and tax deed investing program: The new investor, the retiree investor, and the coaching couple.</p>
<h2><strong>The new investor's Experience: From Uncertainty to Confidence</strong></h2>
<p>The new investor shares her initial doubts about entering the world of tax defaulted property investing. Despite trying to learn on her own, she found the process overwhelming. Attending the instructor's workshop and engaging with other investors gave her the confidence and clarity she needed. The new investor's story underscores how accessible the system becomes with the right guidance and community support, and she expresses gratitude for finding a reliable vehicle to help her family's financial future.</p>
<h2><strong>The retiree investor: Learning by Example</strong></h2>
<p>The retiree investor emphasizes the importance of seeing real people succeed before feeling confident enough to take action herself. By watching a variety of student and coach experiences, the retiree investor gained the practical knowledge and assurance needed to participate in auctions and make informed decisions. Her story illustrates the value of exposure to diverse strategies and outcomes, which built her confidence to move forward as an investor.</p>
<h2><strong>the coaching couple: Building Success Together</strong></h2>
<p>The coaching couple, a husband-and-wife coaching team, discuss how their strong partnership and friendship have been central to their success in real estate investing. They describe how tax lien and tax deed investing enabled them to build a business that provided both financial rewards and the flexibility to focus on family. Their story highlights the importance of dividing responsibilities, leveraging each other's strengths, and taking action together. The the coaching couples' approach shows how couples can create a balanced, profitable, and family-oriented investing business.</p>
<p><strong>Key Takeaways</strong></p>
<ul><li><p>The program is accessible to anyone, regardless of background, with the right training and support.</p></li><li><p>Community, mentorship, and real-life examples are invaluable for building confidence and avoiding costly mistakes.</p></li><li><p>Tax lien and tax deed investing can be managed entirely online, making it possible to participate from anywhere in the world.</p></li><li><p>Success is built on thorough research, learning from others, and leveraging the expertise of experienced coaches.</p></li></ul>
<p>This video demonstrates that with education, mentorship, and a supportive community, anyone can achieve financial security and flexibility through tax lien and tax deed investing.</p>$$
WHERE title = 'Lesson 6'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 7
UPDATE lessons
SET body = $$<h1><strong>Tax Lien &amp; Tax Deed Investing: The new investor's Breakthrough and The seasoned coach's Insights</strong></h1>
<p>This video focuses on the experiences of the new investor and seasoned coach the seasoned coach, illustrating how the instructor's system empowers both beginners and experienced investors in tax lien certificates and tax deeds.</p>
<h2><strong>The new investor's Journey: From Uncertainty to Action</strong></h2>
<p>The new investor candidly shares her initial doubts and lack of background in real estate or tax-defaulted property investing. Despite trying to learn on her own, she found the process overwhelming. Attending the instructor's workshop and engaging with the supportive community gave her the confidence to move forward. The new investor highlights how hearing from others who started in her position helped her believe she could succeed. She expresses gratitude for finally finding a reliable investment vehicle to help her family's financial future, emphasizing the importance of mentorship and community support.</p>
<h2><strong>The seasoned coach: Building Wealth Step by Step</strong></h2>
<p>The seasoned coach brings a wealth of experience, having started with small investments and gradually scaling up. He explains how he learned the instructor's system, took calculated risks, and built confidence through hands-on experience. The seasoned coach underscores the safety and predictability of tax lien certificates—where most investments are redeemed for high, government-mandated interest rates, and, in rare cases, investors can acquire properties for just the back taxes owed. He also discusses the advantages of using retirement accounts (IRAs) for tax-advantaged, long-term wealth building, and shares practical advice on starting small, learning the process, and scaling up as confidence grows.</p>
<p><strong>Key Takeaways</strong></p>
<ul><li><p>The system is accessible to anyone, regardless of experience, with the right education and support.</p></li><li><p>Community and mentorship are crucial for building confidence and avoiding costly mistakes.</p></li><li><p>Tax lien and tax deed investing can be managed entirely online, making it possible to participate from anywhere.</p></li><li><p>Starting small and leveraging proven strategies leads to steady, scalable success.</p></li></ul>
<p><strong>Summary</strong></p>
<p>Through the new investor's breakthrough and The seasoned coach's practical wisdom, this video demonstrates that—with education, mentorship, and perseverance—anyone can achieve financial security and flexibility through tax lien and tax deed investing.</p>$$
WHERE title = 'Lesson 7'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 8
UPDATE lessons
SET body = $$<h1>Focus on the Florida investor, the veteran coach, the investor-coach team, and the student investor</h1>
<p>This video features multiple key individuals sharing their experiences and insights into tax lien certificate and tax deed investing under the instructor's system.</p>
<h2><strong>The Florida investor's Story:</strong></h2>
<p>The Florida investor shares how she transitioned from frustration with the volatile stock market to confidently investing in tax lien certificates. She has purchased dozens of certificates ranging from a couple hundred to nearly a thousand dollars each, earning consistent interest rates between 8% and 18%. The Florida investor exemplifies how tax lien investing offers a safe, secure, and predictable income stream, all managed from home.</p>
<h2><strong>The veteran coach:</strong></h2>
<p>The veteran coach, one of the instructor's earliest students and coaches, discusses his journey from video production to becoming a seasoned investor. He emphasizes the safety and reliability of tax lien certificates, noting that he has never lost money on hundreds of investments. The veteran coach highlights the importance of buying quality liens with high redemption rates and shares practical advice on starting small and scaling up. He also stresses the advantage of using retirement accounts (IRAs) for tax-advantaged investing.</p>
<h2><strong>The investor-coach team:</strong></h2>
<p>The investor-coach team, a coaching couple, recount their path to success through tax lien and tax deed investing. Their first major deal involved acquiring a $1,000 tax lien certificate on a $180,000 condo, which they ultimately foreclosed, rented, and sold for a six-figure profit. They stress the importance of thorough research, including identifying owners unlikely to redeem (e.g., deceased, out-of-state), and leveraging expert legal help for foreclosures. Their story illustrates how strategic property acquisition and management can generate substantial wealth.</p>
<h2><strong>The student investor's Experience:</strong></h2>
<p>The student investor, guided by the investor-coach team, shares his progression from no real estate background to winning his first property at a Michigan tax deed auction. Through the instructor's training and buying tours, the student investor learned to research, inspect, bid, and navigate challenges such as occupant eviction. His first property, purchased for about $58,000, was sold for $161,000 after minor repairs, demonstrating the value of coaching, persistence, and hands-on learning.</p>
<p><strong>Summary:</strong></p>
<p>his video underscores the diversity of successful tax lien and tax deed investing strategies—from passive income via certificates to active property acquisition and resale. The featured investors and coaches highlight key lessons: start small, conduct thorough research, leverage expert guidance, and use retirement accounts for tax benefits. Together, their stories showcase how the instructor's system enables investors to build secure, predictable, and substantial wealth in this government-backed market.</p>$$
WHERE title = 'Lesson 8'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );

-- Lesson 9
UPDATE lessons
SET body = $$<h1>Lesson 9: Featuring the Instructor, Coaches, and Student Investors</h1>
<p>Lesson 9 brings together a diverse group of investors and coaches, each sharing their unique journeys and strategies for success in tax lien certificate and tax deed investing.</p>
<h2><strong>The instructor</strong></h2>
<p>The instructor opens the lesson with his personal story of discovering tax-defaulted property investing after bankruptcy, emphasizing the safety, predictability, and government-backed nature of tax liens and deeds. He explains how the business has evolved from courthouse research and newspaper lists to a streamlined, online process accessible from anywhere in the world. The instructor's decades of experience have shaped a training program and community that supports both new and seasoned investors.</p>
<h2><strong>The Florida investor</strong></h2>
<p>The Florida investor describes her transition from the unpredictable stock market to the stability of tax lien certificates. She shares how she purchased dozens of certificates online, earning consistent returns between 8% and 18%, and highlights the ease and security of investing from home with the instructor's training.</p>
<h2><strong>The veteran coach</strong></h2>
<p>The veteran coach recounts his journey from video producer to one of the instructor's earliest and most successful students. The veteran coach emphasizes the importance of careful property selection, research, and starting small. He shares his experience never losing money on hundreds of tax lien and tax deed investments, and advocates using retirement accounts (IRAs) for tax-advantaged, long-term wealth building.</p>
<h2><strong>The investor-coach team</strong></h2>
<p>The investor-coach team detail their approach to both tax liens and deeds, focusing on finding properties less likely to redeem for the chance to acquire them at deep discounts. They recount dramatic deals—like turning a $1,000 tax lien into a $180,000 condo and making $24,000 in just nine days on another property—while stressing the importance of research, teamwork, and leveraging legal and local experts for due diligence and foreclosures.</p>
<h2><strong>The student investor</strong></h2>
<p>The student investor shares his journey from warehouse worker to successful tax deed investor. With the investor-coach team's coaching, he navigated auctions in multiple states, learned to research, bid, and manage properties, and ultimately netted substantial profits on his first Michigan deal. The student investor's story highlights the value of perseverance, mentorship, and learning from setbacks and mistakes.</p>
<h2><strong>The physician investor</strong></h2>
<p>The physician investor explains how she scaled her tax deed business using other people's money, earning significant profits and using those funds for philanthropic work. She underscores the importance of ongoing education, mentorship, and adapting strategies as markets and personal goals evolve.</p>
<h2><strong>Key Takeaways</strong></h2>
<ul><li><p>Tax lien and tax deed investing is accessible, secure, and can be started with modest capital.</p></li><li><p>Success depends on thorough research, understanding auction rules, and learning from experienced coaches.</p></li><li><p>Real-world examples show profits ranging from steady interest income to six-figure windfalls on single deals.</p></li><li><p>The community and support network—through workshops, buying tours, and live coaching—are invaluable for building confidence and avoiding costly mistakes.</p></li></ul>
<p><strong>Summary</strong></p>
<p>Lesson 9 encapsulates the breadth of the instructor's program, demonstrating through the voices of the instructor, the coaches, and the featured student investors how anyone can achieve financial security and flexibility through tax lien and tax deed investing—provided they leverage the right education, resources, and community support.</p>$$
WHERE title = 'Lesson 9'
  AND module_id IN (
    SELECT m.id 
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug = 'investing-fundamentals'
  );
